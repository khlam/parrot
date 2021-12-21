FROM python:3.8.12-alpine3.15 AS base
RUN apk add --update --no-cache ffmpeg nodejs npm
WORKDIR /app
COPY . /app
RUN npm install

FROM base AS dev
RUN npm install -g nodemon
CMD nodemon -L main.js

FROM base
CMD node main.js