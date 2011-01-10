#define _POSIX_C_SOURCE 1

#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>

#include "event.h"
#include "sck.h"
#include "encoder.h"

#include "dbuf.h"
#include "dtab.h"
#include "common.h"

#define CRLF "\r\n"

DBUF(http, 4096);

typedef struct http_option_t {
    char *name;
    char *value;
} http_option_t;

DTAB(option, http_option_t);
DTAB(pevent, event_t *);

#define BUFFER_CIRC_SIZE 1024*1024

dtab_t(pevent)*    out_wait;

typedef struct buffer_circ_t {
    uint8_t data[BUFFER_CIRC_SIZE];
    int     pos;
} buffer_circ_t;

buffer_circ_t*     input;

typedef struct http_client_t {
    dbuf_t(http)*      buf;
    int                pos;
    int                http_major;
    int                http_minor;
    char*              action;
    char*              url;
    dtab_t(option)*    options;
    int                input_pos;
    encoder_hdl_t      enc;
} http_client_t;

static int fd_src = 0;

void buffer_circ_init(buffer_circ_t* bc)
{
    bc->pos = 0;
}

buffer_circ_t* buffer_circ_new(void)
{
    buffer_circ_t* bc;

    bc = (buffer_circ_t*) malloc(sizeof(buffer_circ_t));
    buffer_circ_init(bc);
    
    return bc;
}

void buffer_circ_delete(buffer_circ_t* bc)
{
    free(bc);
}

void buffer_circ_add(buffer_circ_t* bc, uint8_t* data, int size)
{
    int bread;

    while(size)
    {
        bread   = MIN(size, BUFFER_CIRC_SIZE - bc->pos);

        memcpy(&bc->data[bc->pos], data, bread);
        bc->pos  += bread;
        size     -= bread;
        data     += bread;
        if(bc->pos == BUFFER_CIRC_SIZE)
            bc->pos = 0;
    }
}

int buffer_circ_get(buffer_circ_t* bc, uint8_t* data, int size, int* pos)
{
    int tread;
    int bread;

    *pos   %= BUFFER_CIRC_SIZE;
    tread   = 0;

    if(*pos == bc->pos)
        return 0;

    while(size)
    {
        if(*pos < bc->pos)
        {
            bread   = MIN(size, bc->pos - *pos);
        } else {
            bread   = MIN(size, BUFFER_CIRC_SIZE - *pos);
        }

        memcpy(data, &bc->data[*pos], bread);
        *pos     += bread;
        size     -= bread;
        data     += bread;
        tread    += bread;
        *pos     %= BUFFER_CIRC_SIZE;
        if(*pos == bc->pos)
            break;
    }

    return tread;
}

int buffer_circ_fetch(buffer_circ_t* bc)
{
    uint8_t buffer[BUFFER_CIRC_SIZE/4];
    int     bread;

    bread = read(fd_src, buffer, sizeof(buffer));
    if(bread <= 0)
        return bread;
    buffer_circ_add(bc, buffer, bread);

    return bread;
}

char *strdelim(char *str, const char *delim, int size, char **saveptr)
{
    char *txt;

    assert(delim);
    assert(saveptr);

    if(str)
        txt = str;
    else
        txt = *saveptr;

    if(txt == NULL)
        return NULL;

    *saveptr = strstr(txt, delim);

    if(*saveptr != NULL)
    {
        **saveptr  = 0;
        *saveptr  += size;
    }

    return txt;
}

int http_request(http_client_t *hclt, char *request)
{
    char *pos;
    char *http_version;
    int   ret;

    hclt->input_pos  = input->pos + BUFFER_CIRC_SIZE / 2;
    hclt->input_pos %= BUFFER_CIRC_SIZE;
    hclt->action     = strtok_r(request, " ", &pos);
    hclt->url        = strtok_r(NULL,    " ", &pos);
    http_version     = strtok_r(NULL,    " ", &pos);

    if(http_version == NULL ||
       hclt->url    == NULL ||
       hclt->action == NULL)
    {
        return -1;
    }

    ret = sscanf(http_version, "HTTP/%i.%i",
                 &hclt->http_major, &hclt->http_minor);

    if(ret != 2)
        return -1;

    return 0;
}

int http_header(http_client_t *hclt, char *header)
{
    char             *line;
    char             *pos;
    char             *value;
    http_option_t     *opt;

    line   = strdelim(header, CRLF, sizeof(CRLF)-1, &pos);
    if(http_request(hclt, line) < 0)
        return -1;
    printf("resquest version %i %i url %s action %s\n",
           hclt->http_major, hclt->http_minor, hclt->url, hclt->action);

    header = pos;
    while((line = strdelim(NULL, CRLF, sizeof(CRLF)-1, &pos)) != NULL)
    {
        value = strstr(line, ": ");
        if(value == NULL)
            continue;

        *value  = 0;
        value  += 2;

        opt = dtab_add(option, hclt->options, NULL);
        opt->name  = line;
        opt->value = value;
        
        printf("option %s -> %s\n", line, value);
    }
    return 0;
}

void http_response(http_client_t *hclt, struct pollfd *pfd)
{
    char header[] =
        "HTTP/1.1 200 OK" CRLF
        "Connection: close" CRLF
        "Content-Type: audio/ogg" CRLF
        CRLF;
    hclt = hclt;

    xsend(pfd->fd, header, sizeof(header)-1, 0);
    encoder_init_stream(hclt->enc, pfd->fd);
}

void client_callback(event_t* ev, void *data)
{
    int                     size;
    int                     s;
    http_client_t          *hclt;
    char                   *header;
    struct pollfd          *pfd;
    int                     i;
    event_t               **out_ev;

    pfd = event_fd_get_pfd(ev);

    hclt = data;
    if(pfd->revents & POLLIN)
    {
        size = dbuf_getsize(http, hclt->buf);
        if(size - hclt->pos < 4096)
        {
            dbuf_add(http, hclt->buf, 4096);
            size = dbuf_getsize(http, hclt->buf);
        }
        s = xrecv(pfd->fd, hclt->buf->data + hclt->pos,
                  size - hclt->pos - 1, 0);
        if(s <= 0) {
            xclose(pfd->fd);
            dtab_for_each(pevent, out_wait, out_ev) {
                if(event_fd_get_pfd(*out_ev) == pfd) {
                    dtab_del(pevent, out_wait, i);
                    break;
                }
            }
            event_unregister(ev);
            printf("SHUTDOWN\n");
            return;
        }
        hclt->pos                   += s;
        hclt->buf->data[hclt->pos]   = 0;
        dbuf_setsize(http, hclt->buf, hclt->pos);

        header = strstr((char*)hclt->buf->data, CRLF CRLF);
        if(header != NULL) {
            *header = 0;
            pfd->events = POLLOUT;
            http_header(hclt, (char*)hclt->buf->data);
            dbuf_setsize(http, hclt->buf, 0);
            http_response(hclt, pfd);        
        }
    }
    if(pfd->revents & POLLOUT)
    {
        uint8_t buffer[4096];
        int     size;
        int     rsize;

        do {
            size = buffer_circ_get(input, buffer, sizeof(buffer), &hclt->input_pos);
            if(size == 0) {
                pfd->events = 0;
                dtab_add(pevent, out_wait, &ev);
            } else {
                rsize = xsend(pfd->fd, buffer, size, 0);
                if(rsize <= 0)
                {
                    if(errno == EINTR)
                        continue;
                    xclose(pfd->fd);
                    event_unregister(ev);
                    printf("SHUTDOWN\n");
                    break;
                }
                hclt->input_pos += rsize - size;
            }
        }
        while(0);
    }
    if(pfd->revents & POLLERR || pfd->revents & POLLHUP)
    {
        xclose(pfd->fd);
        dtab_for_each(pevent, out_wait, out_ev) {
            if(event_fd_get_pfd(*out_ev) == pfd) {
                dtab_del(pevent, out_wait, i);
                break;
            }
        }
        event_unregister(ev);
        printf("SHUTDOWN\n");
    }
}

void srv_callback(event_t *ev, void *data)
{
    struct sockaddr_in      addr;
    int                     sck;
    http_client_t          *hclt;
    struct pollfd          *pfd;

    data = data;

    pfd = event_fd_get_pfd(ev);

    sck = xaccept(pfd->fd, &addr);
    if(sck == -1 || xsetnonblock(sck) == -1)
    {
        return;
    }

    hclt              = (http_client_t*) malloc(sizeof(http_client_t));
    hclt->buf         = dbuf_init(http);
    hclt->pos         = 0;
    hclt->options     = dtab_init(option);
    hclt->enc         = data;

    event_fd_register(sck, POLLIN, &client_callback, hclt);
}

void in_callback(event_t *ev, void *data)
{
    struct pollfd  *pfd;
    int             i;

    data = data;

    pfd = event_fd_get_pfd(ev);

    if(pfd->revents & POLLIN)
    {
        event_t        **out_ev;
        buffer_circ_fetch(input);
        dtab_for_each(pevent, out_wait, out_ev) {
            event_fd_get_pfd(*out_ev)->events = POLLOUT;
        }
        out_wait->size = 0;
    }
    if(pfd->revents & POLLERR || pfd->revents & POLLHUP)
    {
        abort();
    }
}

int main(int argc, char *argv[])
{
    int           srv;
    int           con[2];
    encoder_hdl_t enc;

    argc = argc;
    argv = argv;

    out_wait = dtab_init(pevent);
    pipe(con);

    event_init();
    enc = encoder_init(9999, con[1]);
    assert(enc);

    fd_src = con[0];
    input  = buffer_circ_new();
    srv    = xlisten(6080);

    event_fd_register(con[0], POLLIN, &in_callback,  NULL);
    event_fd_register(srv,    POLLIN, &srv_callback, enc);
    event_loop();

    return 0;
}
