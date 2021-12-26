FROM python:3.8-slim-buster AS base

RUN apt-get update && apt-get install -y curl build-essential ffmpeg 

RUN curl "https://nodejs.org/dist/latest-v17.x/node-v17.3.0-linux-x64.tar.xz" -O \
    && tar -xf "node-v17.3.0-linux-x64.tar.xz" \
    && ln -s "/node-v17.3.0-linux-x64/bin/node" /usr/local/bin/node \
    && ln -s "/node-v17.3.0-linux-x64/bin/npm" /usr/local/bin/npm \
    && ln -s "/node-v17.3.0-linux-x64/bin/npx" /usr/local/bin/npx \
    # clear
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f "/node-v17.3.0-linux-x64.tar.xz" \
    && apt-get clean \
    && apt-get autoremove

WORKDIR /app
COPY . /app

RUN npm install -g node-gyp && npm install

RUN pip3 install -r /app/src/python/fastspeech2/requirements.txt 
RUN pip3 install -r /app/src/python/tactron2/requirements.txt
RUN pip3 install -r /app/src/python/song_similarity/requirements.txt 

RUN curl -L -o /app/src/python/song_similarity/data/data.csv https://github.com/khlam/parrot/releases/download/spotify_song_datasets/data.csv

RUN curl -L -o /app/src/python/fastspeech2/output/ckpt/LJSpeech/900000.pth.tar https://github.com/khlam/parrot/releases/download/generator_LJSpeech.pth.tar/900000.pth.tar
RUN curl -L -o /app/src/python/fastspeech2/hifigan/generator_LJSpeech.pth.tar https://github.com/khlam/parrot/releases/download/generator_LJSpeech.pth.tar/generator_LJSpeech.pth.tar

RUN curl -L -o /app/src/python/tactron2/res/David_Attenborough.pt https://github.com/khlam/parrot/releases/download/hifigan%2BMichaelRosen%2BDavid_Attenborough/David_Attenborough.pt
RUN curl -L -o /app/src/python/tactron2/res/hifigan_vocoder https://github.com/khlam/parrot/releases/download/hifigan%2BMichaelRosen%2BDavid_Attenborough/hifigan_vocoder
RUN curl -L -o /app/src/python/tactron2/res/MichaelRosen https://github.com/khlam/parrot/releases/download/hifigan%2BMichaelRosen%2BDavid_Attenborough/MichaelRosen

RUN  apt-get clean && \
  apt-get autoclean && \
  rm -rf /var/cache/* && \
  rm -rf /tmp/* && \
  rm -rf /var/tmp/* && \
  rm -rf /var/lib/apt/lists/*

FROM base AS dev
RUN npm install --global nodemon
CMD /node-v17.3.0-linux-x64/lib/node_modules/nodemon/bin/nodemon.js -L main.js

FROM base
RUN npm install --global pm2@latest
CMD /node-v17.3.0-linux-x64/lib/node_modules/pm2/bin/pm2 start pm2-apps.json --no-daemon
