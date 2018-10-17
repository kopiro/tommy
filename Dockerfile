FROM node:8-jessie

WORKDIR /app

RUN apt-get -y update 

# ------- AWSCLI ---------

RUN apt-get install -y \
	python3 \
	python3-pip \
	python3-setuptools \
	groff \
	less \
	&& pip3 install --upgrade pip \
	&& apt-get clean && \
	pip3 install awscli

# ------- FFMPEG ---------

RUN sed -i "s/jessie main/jessie main contrib non-free/" /etc/apt/sources.list && \
	echo "deb http://http.debian.net/debian jessie-backports main contrib non-free" >> /etc/apt/sources.list && \
	apt-get update && apt-get install -y ffmpeg

# ------- WOFF2 ---------

RUN apt-get -y install && \
	git clone --recursive https://github.com/google/woff2.git /usr/share/woff2 && \
	cd /usr/share/woff2 && \
	make clean all && \
	ln -svf /usr/share/woff2/woff2_compress /usr/bin/woff2_compress

# ------- PROCESSORS ---------

RUN npm i -g svgo

RUN apt-get -y install imagemagick jpegoptim pngquant gifsicle webp

# ------- FONT FORGE ---------

RUN apt-get -y install autotools-dev libjpeg-dev libtiff5-dev libpng-dev libgif-dev libxt-dev libfreetype6-dev autoconf automake libtool libltdl7-dev libxml2-dev libuninameslist-dev libspiro-dev python-dev libpango1.0-dev libcairo2-dev chrpath unifont 

RUN git clone https://github.com/fontforge/libspiro.git /usr/share/libspiro && \
	cd /usr/share/libspiro && \
	autoreconf -i && \
	automake --foreign -Wall && \
	./configure && \
	make && \
	make install

RUN git clone https://github.com/fontforge/libuninameslist.git /usr/share/libuninameslist && \
	cd /usr/share/libuninameslist && \
	autoreconf -i && \
	automake --foreign && \
	./configure && \
	make && \
	make install

RUN git clone https://github.com/fontforge/fontforge.git /usr/share/fontforge && \
	cd /usr/share/fontforge && \
	./bootstrap && \
	./configure && \
	make && \
	make install && \
	ldconfig

# ------- APP ---------

COPY package.json /app
RUN npm i

COPY . /app
RUN npm link

ENTRYPOINT ["/usr/local/bin/tommy"]
