CC=gcc
LD=gcc

CFLAGS=-Wunused -W -Wall -Werror -g -Iplugin -I. -fPIC -std=c99
LDFLAGS=-lm -Wall -g -fPIC -logg -lvorbis -lvorbisenc

all: audios jukebox decoder

install: all

audios: event.o main.o sck.o encoder.o
	${LD}  -o $@ $+ ${LDFLAGS}

#encoder: encoder.o event.o
#	${LD}  -o $@ $+ ${LDFLAGS}
#
decoder: decoder.o event.o
	${LD}  -o $@ $+ ${LDFLAGS}

jukebox: event.o jukebox.o sck.o
	${LD}  -o $@ $+ ${LDFLAGS}

clean:
	-rm audios *.o *~
