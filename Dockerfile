FROM node:17-bullseye-slim AS base
RUN apt-get update && apt-get install -y libpcap-dev libpq-dev g++ ffmpeg curl make python3.8-dev python3-pip
WORKDIR /app
COPY . /app
RUN curl -L -o /app/src/python/fastspeech2/output/ckpt/LJSpeech/900000.pth.tar https://github.com/khlam/parrot/releases/download/generator_LJSpeech.pth.tar/900000.pth.tar
RUN curl -L -o /app/src/python/fastspeech2/hifigan/generator_LJSpeech.pth.tar https://github.com/khlam/parrot/releases/download/generator_LJSpeech.pth.tar/generator_LJSpeech.pth.tar
RUN npm install -g node-gyp && npm install
RUN pip3 install -r /app/src/python/fastspeech2/requirements.txt 

FROM base AS dev
RUN npm install -g nodemon
CMD nodemon -L main.js

FROM base
CMD node main.js
