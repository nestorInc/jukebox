CC=gcc
LD=gcc

CFLAGS=-Wunused -W -Wall -Werror -O0 -g -Iplugin -I. -Ilibjukebox -fPIC
LDFLAGS=-ldl -lpthread -lm -Wall -g -fPIC

all: audios

install: all

audios: event.o main.o sck.o
	${LD}  -o audios $+ ${LDFLAGS}

clean:
	-rm audios *.o *~
