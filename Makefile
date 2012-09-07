CFLAGS=-fPIC -W -Wall -Werror -g
LD=gcc
LDFLAGS=-pthread -g

encoder: encoder.o mp3.o thread_pool.o mstring.o
	${LD} -o $@ $+ ${LDFLAGS} 