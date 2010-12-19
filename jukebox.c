#define _POSIX_SOURCE 1

#include <stdio.h>
#include <fcntl.h>
#include <stdint.h>
#include <string.h>
#include <unistd.h>
#include <time.h>

#include "dtab.h"
#include "dbuf.h"
#include "event.h"
#include "sck.h"


DBUF(file, 8192);
DTAB(file, uint8_t*)

dbuf_t(file) * load_file(char * file)
{
    int           fd;
    int           s;
    int           size_all;
    uint8_t*      buf;
    dbuf_t(file) *ret;

    fd = 0;
    if(file != NULL) {
        fd = open(file, O_RDONLY);
        if(fd == -1) {
            return NULL;
        }
    }
    ret      = dbuf_init(file);
    size_all = 0;
    while(1)
    {
        buf = dbuf_add(file, ret, 8192);
        s = read(fd, buf, 8192);
        if(s <= 0)
            break;
        size_all += s;
        dbuf_setsize(file, ret, size_all);
    }

    buf    = dbuf_add(file, ret, 1);
    buf[0] = 0;
    close(fd);

    return ret;
}

dtab_t(file) * parse_file(dbuf_t(file) *file)
{
    uint8_t      *buf;
    uint8_t      *data;
    uint8_t      *value;
    dtab_t(file) *ret;

    ret = dtab_init(file);


    buf  = file->data;
    data = file->data;
    while((value = (uint8_t*)strtok_r((char*)data, "\n\r", (char**) &buf)) != NULL) {
        data = NULL;
        dtab_add(file, ret, &value);
    }

    return ret;
}

static event_t *file_in;
static event_t *file_out;

void callback(event_t *ev, void *data);

void load_new_file(dtab_t(file) *file_list)
{
    int      s;
    uint8_t *file;
    int      fd;

    s = rand() % file_list->size;
    file = file_list->data[s];

    fd = open((char*)file, O_RDONLY);
    if(fd == -1) {
        abort();
    }

    file_in = event_fd_register(fd, POLLIN, callback, file_list);
}

void callback(event_t *ev, void *data)
{
    struct pollfd          *pfd_in;
    struct pollfd          *pfd_out;
    static uint8_t          buffer[4096];
    int                     s;
    dtab_t(file)           *file_list;

    file_list = data;
    pfd_in    = event_fd_get_pfd(file_in);
    pfd_out   = event_fd_get_pfd(file_out);

    if(pfd_in->revents & POLLIN)
    {
        s = read(pfd_in->fd, buffer, 4096);
        if(s <= 0) {
            close(pfd_in->fd);
            event_unregister(ev);
            load_new_file(file_list);
        } else {
            write(pfd_out->fd, buffer, 4096);
            pfd_in->events  = 0;
            pfd_out->events = POLLOUT;
        }
    }

    if(pfd_out->revents & POLLOUT)
    {
        pfd_in->events  = POLLIN;
        pfd_out->events = 0;
    }
    if(pfd_out->revents & POLLERR)
    {
        abort();
    }
}


int main(int argc, char **argv)
{
//    int            srv;
    dbuf_t(file)  *library;
    dtab_t(file)  *file_list;

    if(argc < 2) {
        library = load_file(NULL);
    } else {
        library = load_file(argv[1]);
    }

    if(library == NULL) {
        printf("Can't load file %s\n", argv[1]);
        return 1;
    }

    file_list = parse_file(library);

    event_init();
    srand(time(0));
//    xsetnonblock(1);
//    srv = xlisten(6080);
    file_out = event_fd_register(1, 0, callback, file_list);
    load_new_file(file_list);
    event_loop();

    return 0;
}
