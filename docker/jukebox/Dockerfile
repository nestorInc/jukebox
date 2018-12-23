FROM debian:sid-slim

RUN apt update -y && \
apt upgrade -y --no-install-recommends && \
apt install -y --no-install-recommends wget unzip grunt npm ruby ruby-bcrypt ruby-eventmachine ruby-sqlite3 && \
mkdir /apps && \
wget -q https://github.com/nestorInc/jukebox/archive/master.zip && \
unzip -d /apps master.zip && \
cd /apps/jukebox-master; npm install grunt-contrib-uglify grunt-contrib-concat grunt-contrib-cssmin grunt-contrib-jshint; grunt; \
apt remove -y --purge unzip grunt npm

COPY jukebox.cfg /apps/jukebox-master

VOLUME /apps/jukebox-master/mp3
VOLUME /apps/jukebox-master/encode
VOLUME /apps/jukebox-master/uploads

EXPOSE 8080

WORKDIR /apps/jukebox-master
USER jukebox

CMD ./jukebox.rb
