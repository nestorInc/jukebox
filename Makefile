CFLAGS=-fPIC -W -Wall -Werror -g
LD=gcc
LDFLAGS=-pthread -g -lsqlite3

encoder: encoder.o mp3.o thread_pool.o db.o mstring.o
	${LD} -o $@ $+ ${LDFLAGS} 
