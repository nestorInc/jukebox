CC=gcc
LD=gcc

CFLAGS=-Wunused -W -Wall -Werror -g -Iplugin -I. -fPIC
LDFLAGS=-lm -Wall -g -fPIC -logg -lvorbis -lvorbisenc

all: audios encoder

install: all

audios: event.o main.o sck.o
	${LD}  -o $@ $+ ${LDFLAGS}

encoder: encoder.o
	${LD}  -o $@ $+ ${LDFLAGS}

clean:
	-rm audios *.o *~
