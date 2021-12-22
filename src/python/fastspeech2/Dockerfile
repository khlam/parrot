FROM python:3.8-slim-buster as base
RUN apt-get -y update && apt-get install -y libpcap-dev libpq-dev g++
WORKDIR /app
COPY . /app
RUN pip3 install -r requirements.txt
