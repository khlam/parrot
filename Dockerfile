FROM node:17-bullseye-slim AS base
RUN apt-get update && apt-get install -y libpcap-dev libpq-dev g++ ffmpeg curl make python3.8-dev python3-pip
WORKDIR /app
COPY . /app
RUN npm install -g node-gyp && npm install
RUN pip3 install -r /app/src/python/fastspeech2/requirements.txt 

FROM base AS dev
RUN npm install -g nodemon
#CMD python3 /app/src/python/fastspeech2/main.py
#CMD nodemon -L main.js

FROM base
CMD node main.js
