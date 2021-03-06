import argparse
import os
import torch
import numpy as np
from scipy.io.wavfile import write
from os.path import dirname, abspath
import sys
import re
import nltk

import textwrap

nltk.download("punkt")

sys.path.append(dirname(dirname(abspath(__file__))))

from models.tactron_2_model import Tacotron2
from clean_text import clean_text
from vocoders import Hifigan


def load_model(model_path):
    """
    Loads the Tacotron2 model.
    Uses GPU if available, otherwise uses CPU.

    Parameters
    ----------
    model_path : str
        Path to tacotron2 model

    Returns
    -------
    Tacotron2
        Loaded tacotron2 model
    """
    if torch.cuda.is_available():
        model = Tacotron2().cuda()
        model.load_state_dict(torch.load(model_path)["state_dict"])
        _ = model.cuda().eval().half()
    else:
        model = Tacotron2()
        model.load_state_dict(torch.load(model_path, map_location=torch.device("cpu"))["state_dict"])
    return model

def generate_graph(alignments, filepath, heading=""):
    """
    Generates synthesis alignment graph image.

    Parameters
    ----------
    alignments : list
        Numpy alignment data
    filepath : str
        Path to save image to
    heading : str (optional)
        Graph heading
    """
    data = alignments.float().data.cpu().numpy()[0].T
    plt.imshow(data, aspect="auto", origin="lower", interpolation="none")
    if heading:
        plt.title(heading)
    plt.savefig(filepath)


def text_to_sequence(text, symbols):
    """
    Generates text sequence for audio file

    Parameters
    ----------
    text : str
        Text to synthesize
    symbols : list
        List of valid symbols
    """
    symbol_to_id = {s: i for i, s in enumerate(symbols)}
    sequence = np.array([[symbol_to_id[s] for s in text if s in symbol_to_id]])
    if torch.cuda.is_available():
        return torch.autograd.Variable(torch.from_numpy(sequence)).cuda().long()
    else:
        return torch.autograd.Variable(torch.from_numpy(sequence)).cpu().long()


def join_alignment_graphs(alignments):
    """
    Joins multiple alignment graphs.

    Parameters
    ----------
    alignments : list
        List of alignment Tensors

    Returns
    -------
    Tensor
        Combined alignment tensor
    """
    alignment_sizes = [a.size() for a in alignments]
    joined = torch.zeros((1, sum([a[1] for a in alignment_sizes]), sum([a[2] for a in alignment_sizes])))
    current_x = 0
    current_y = 0
    for alignment in alignments:
        joined[:, current_x : current_x + alignment.size()[1], current_y : current_y + alignment.size()[2]] = alignment
        current_x += alignment.size()[1]
        current_y += alignment.size()[2]
    return joined


def check_character_count(text, length):
    for line in text:
        print(line, len(line))
        if (len(line) >= length):
            return True
    return False

def synthesize(
    model,
    text,
    symbols=list("_-!'(),.:;? ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"),
    graph_path=None,
    audio_path=None,
    vocoder=None,
    silence_padding=0.15,
    sample_rate=22050,
    max_decoder_steps=1000,
    split_text=False,
):
    """
    Synthesise text for a given model.
    Produces graph and/or audio file when given.
    Supports multi line synthesis (seperated by \n).

    Parameters
    ----------
    model : Tacotron2
        Tacotron2 model
    text : str/list
        Text to synthesize (or list of lines to synthesize)
    symbols : list
        List of symbols (default is English)
    graph_path : str (optional)
        Path to save alignment graph to
    audio_path : str (optional)
        Path to save audio file to
    vocoder : Object (optional)
        Vocoder model (required if generating audio)
    silence_padding : float (optional)
        Seconds of silence to seperate each clip by with multi-line synthesis (default is 0.15)
    sample_rate : int (optional)
        Audio sample rate (default is 22050)
    max_decoder_steps : int (optional)
        Max decoder steps controls sequence length and memory usage during inference.
        Increasing this will use more memory but may allow for longer sentences. (default is 1000)
    split_text : bool (optional)
        Whether to use the split text tool to convert a block of text into multiple shorter sentences
        to synthesize (default is True)

    Raises
    -------
    AssertionError
        If audio_path is given without a vocoder
    """
    if audio_path:
        assert vocoder, "Missing vocoder"

    original_text = text

    text = nltk.tokenize.sent_tokenize(original_text)
    
    text = [line.strip() for line in text if line.strip()]

    if (check_character_count(text, 120) == True):
        text = re.split('[?.,]', original_text) # split on punctuation
        text = [t for t in text if ((t != "") and (t != ".") and (t != "!") and (t != "?") and (t != ",") and (t != ";") and (t != ":"))]

        #if check_character_count(text, 10) == True:
        #    text = textwrap.wrap(original_text, 10, break_long_words=True)

    print(text)

    mels = []
    #alignments = []
    for i, line in enumerate(text):
        line = clean_text(line.strip(), symbols)
        sequence = text_to_sequence(line, symbols)
        try:
            _, mel_outputs_postnet, _, _ = model.inference(sequence, max_decoder_steps)
            mels.append(mel_outputs_postnet)
        except:
            break
        
    if audio_path:
        silence = np.zeros(int(silence_padding * sample_rate)).astype("int16")
        audio_segments = []
        for i in range(len(mels)):
            audio_segments.append(vocoder.generate_audio(mels[i]))
            if i != len(mels) - 1:
                audio_segments.append(silence)

        audio = np.concatenate(audio_segments)
        write(audio_path, sample_rate, audio)

    return


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Synthesize audio using model and vocoder")
    parser.add_argument("-m", "--model_path", type=str, help="tacotron2 model path", required=False)
    parser.add_argument("-vm", "--vocoder_model_path", type=str, help="vocoder model path", required=False)
    parser.add_argument("-hc", "--hifigan_config_path", type=str, help="hifigan_config path", required=False)
    parser.add_argument("-t", "--text", type=str, help="text to synthesize", required=False)
    parser.add_argument("-g", "--graph_output_path", type=str, help="path to save alignment graph to", required=False)
    parser.add_argument("-a", "--audio_output_path", type=str, help="path to save output audio to", required=False)
    parser.add_argument("--silence_padding", type=float, help="Padding between sentences in seconds", default=0.15)
    parser.add_argument("--sample_rate", type=int, help="Audio sample rate", default=22050)

    parser.add_argument("--out_id", type=str)

    parser.add_argument("--model_select", type=int) # 1 = David_Attenborough; 2 = MichaelRosen

    args = parser.parse_args()

    #assert os.path.isfile(args.model_path), "Model not found"
    #assert os.path.isfile(args.vocoder_model_path), "vocoder model not found"

    #args.text = "hey hey ho ho pee pee poo poo"
    args.sample_rate = 22050

    args.model_path = "/app/src/python/tactron2/res/David_Attenborough.pt"
    
    if (args.model_select == 2):
        args.model_path = "/app/src/python/tactron2/res/MichaelRosen"
    
    args.vocoder_model_path = "/app/src/python/tactron2/res/hifigan_vocoder"
    args.hifigan_config_path = "/app/src/python/tactron2/models/hifigan_config.json"
    args.audio_output_path = "/tmp/" + args.out_id + ".wav"
    
    model = load_model(args.model_path)
    vocoder = Hifigan(args.vocoder_model_path, args.hifigan_config_path)

    synthesize(
        model=model,
        text=args.text,
        graph_path=args.graph_output_path,
        audio_path=args.audio_output_path,
        vocoder=vocoder,
        silence_padding=args.silence_padding,
        sample_rate=args.sample_rate,
    )
    
    print(args.out_id, "SUCCESS")
