
CFLAGS=-g -W -Wall -Werror
LD=gcc

all: test

test: mp3.o
	$(LD) -o $@ $<