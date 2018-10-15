FROM node:8-jessie

WORKDIR /app

RUN apt-get -y update 

RUN apt-get install -y \
	python3 \
	python3-pip \
	python3-setuptools \
	groff \
	less \
	&& pip3 install --upgrade pip \
	&& apt-get clean && \
	pip3 install awscli

RUN apt-get -y install imagemagick
RUN apt-get -y install jpegoptim 
RUN apt-get -y install pngquant 
RUN apt-get -y install gifsicle 
RUN apt-get -y install webp

RUN sed -i "s/jessie main/jessie main contrib non-free/" /etc/apt/sources.list && \
	echo "deb http://http.debian.net/debian jessie-backports main contrib non-free" >> /etc/apt/sources.list && \
	apt-get update && apt-get install -y ffmpeg

RUN npm i -g svgo

RUN apt-get -y install fontforge

RUN apt-get -y install && \
	git clone --recursive https://github.com/google/woff2.git /usr/share/woff2 && \
	cd /usr/share/woff2 && \
	make clean all && \
	ln -svf /usr/share/woff2/woff2_compress /usr/bin/woff2_compress

COPY package.json /app
RUN npm i

COPY . /app
RUN npm link

ENTRYPOINT ["/usr/local/bin/tommy"]
