FROM node:8-jessie

VOLUME "/src"
VOLUME "/dst"
WORKDIR /app
ENTRYPOINT "/app/entrypoint.sh"

RUN apt-get -y update 

RUN apt-get -y install imagemagick
RUN apt-get -y install jpegoptim 
RUN apt-get -y install pngquant 
RUN apt-get -y install gifsicle 
RUN apt-get -y install webp

RUN sed -i "s/jessie main/jessie main contrib non-free/" /etc/apt/sources.list && \
   echo "deb http://http.debian.net/debian jessie-backports main contrib non-free" >> /etc/apt/sources.list && \
   apt-get update && apt-get install -y ffmpeg

COPY ./app/package.json /app
RUN npm i
COPY ./app /app