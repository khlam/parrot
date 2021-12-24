import re
import argparse
from string import punctuation

import torch
import yaml
import numpy as np
from torch.utils.data import DataLoader
from g2p_en import G2p

from utils.model import get_model, get_vocoder
from utils.tools import to_device, synth_samples
from text import text_to_sequence

import pickle

#device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
device = torch.device("cpu")

def read_lexicon(lex_path):
    '''
    lexicon = {}
    with open(lex_path) as f:
        for line in f:
            temp = re.split(r"\s+", line.strip("\n"))
            word = temp[0]
            phones = temp[1:]
            if word.lower() not in lexicon:
                lexicon[word.lower()] = phones
    #pickle.dump(lexicon, open( "/app/src/python/fastspeech2/lexicon/lexicon.p", "wb" ) )
    return lexicon'''
    return pickle.load( open( "/app/src/python/fastspeech2/lexicon/lexicon.p", "rb" ) )


def preprocess_english(text, preprocess_config):
    text = text.rstrip(punctuation)
    lexicon = read_lexicon(preprocess_config["path"]["lexicon_path"])

    g2p = G2p()
    phones = []
    words = re.split(r"([,;.\-\?\!\s+])", text)
    for w in words:
        if w.lower() in lexicon:
            phones += lexicon[w.lower()]
        else:
            phones += list(filter(lambda p: p != " ", g2p(w)))
    phones = "{" + "}{".join(phones) + "}"
    phones = re.sub(r"\{[^\w\s]?\}", "{sp}", phones)
    phones = phones.replace("}{", " ")

    print("Raw Text Sequence: {}".format(text))
    print("Phoneme Sequence: {}".format(phones))
    sequence = np.array(
        text_to_sequence(
            phones, preprocess_config["preprocessing"]["text"]["text_cleaners"]
        )
    )

    return np.array(sequence)

def synthesize(model, step, configs, vocoder, batchs, control_values, out_file):
    preprocess_config, model_config, train_config = configs
    pitch_control, energy_control, duration_control = control_values

    for batch in batchs:
        batch = to_device(batch, device)
        with torch.no_grad():
            # Forward
            output = model(
                *(batch[2:]),
                p_control=pitch_control,
                e_control=energy_control,
                d_control=duration_control
            )
            synth_samples(
                batch,
                output,
                vocoder,
                model_config,
                preprocess_config,
                train_config["path"]["result_path"],
                out_file
            )


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--text",
        type=str,
        default=None,
        help="raw text to synthesize, for single-sentence mode only",
    )

    parser.add_argument("--out_file", type=str)
    
    args = parser.parse_args()

    args.restore_step = 900000
    args.mode = "single"
    
    args.speaker_id = 0
    args.pitch_control = 1
    args.energy_control = 1
    args.duration_control = 1

    # Read Config

    #preprocess_config = yaml.load(open(args.preprocess_config, "r"), Loader=yaml.FullLoader)
    preprocess_config = yaml.safe_load('''
        dataset: "LJSpeech"

        path:
            corpus_path: "/home/ming/Data/LJSpeech-1.1"
            lexicon_path: "/app/src/python/fastspeech2/lexicon/librispeech-lexicon.txt"
            raw_path: "./raw_data/LJSpeech"
            preprocessed_path: "/app/src/python/fastspeech2/preprocessed_data/LJSpeech"

        preprocessing:
            val_size: 512
            text:
                text_cleaners: ["english_cleaners"]
                language: "en"
            audio:
                sampling_rate: 22050
                max_wav_value: 32768.0
            stft:
                filter_length: 1024
                hop_length: 256
                win_length: 1024
            mel:
                n_mel_channels: 80
                mel_fmin: 0
                mel_fmax: 8000 # please set to 8000 for HiFi-GAN vocoder, set to null for MelGAN vocoder
            pitch:
                feature: "phoneme_level" # support 'phoneme_level' or 'frame_level'
                normalization: True
            energy:
                feature: "phoneme_level" # support 'phoneme_level' or 'frame_level'
                normalization: True
        ''')

    #model_config = yaml.load(open(args.model_config, "r"), Loader=yaml.FullLoader)
    model_config = yaml.safe_load('''
        transformer:
            encoder_layer: 4
            encoder_head: 2
            encoder_hidden: 256
            decoder_layer: 6
            decoder_head: 2
            decoder_hidden: 256
            conv_filter_size: 1024
            conv_kernel_size: [9, 1]
            encoder_dropout: 0.2
            decoder_dropout: 0.2

        variance_predictor:
            filter_size: 256
            kernel_size: 3
            dropout: 0.5

        variance_embedding:
            pitch_quantization: "linear" # support 'linear' or 'log', 'log' is allowed only if the pitch values are not normalized during preprocessing
            energy_quantization: "linear" # support 'linear' or 'log', 'log' is allowed only if the energy values are not normalized during preprocessing
            n_bins: 256

        multi_speaker: False

        max_seq_len: 1000

        vocoder:
            model: "HiFi-GAN" # support 'HiFi-GAN', 'MelGAN'
            speaker: "LJSpeech" # support  'LJSpeech', 'universal'
    ''')

    #train_config = yaml.load(open(args.train_config, "r"), Loader=yaml.FullLoader)
    train_config = yaml.safe_load('''
    path:
        ckpt_path: "/app/src/python/fastspeech2/output/ckpt/LJSpeech"
        log_path: "/app/src/python/fastspeech2/output/log/LJSpeech"
        result_path: "/tmp/"
    optimizer:
        batch_size: 16
        betas: [0.9, 0.98]
        eps: 0.000000001
        weight_decay: 0.0
        grad_clip_thresh: 1.0
        grad_acc_step: 1
        warm_up_step: 4000
        anneal_steps: [300000, 400000, 500000]
        anneal_rate: 0.3
    step:
        total_step: 900000
        log_step: 100
        synth_step: 1000
        val_step: 1000
        save_step: 100000
    ''')

    configs = (preprocess_config, model_config, train_config)

    # Get model
    model = get_model(args, configs, device, train=False)

    # Load vocoder
    vocoder = get_vocoder(model_config, device)

    if args.mode == "single":
        ids = raw_texts = [args.text[:100]]
        speakers = np.array([args.speaker_id])
        if preprocess_config["preprocessing"]["text"]["language"] == "en":
            texts = np.array([preprocess_english(args.text, preprocess_config)])
        text_lens = np.array([len(texts[0])])
        batchs = [(ids, raw_texts, speakers, texts, text_lens, max(text_lens))]

    control_values = args.pitch_control, args.energy_control, args.duration_control

    synthesize(model, args.restore_step, configs, vocoder, batchs, control_values, args.out_file)
    print(args.out_file, "SUCCESS")
