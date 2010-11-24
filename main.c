#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>

#include "event.h"
#include "sck.h"

#include "dbuf.h"
#include "dtab.h"

#define CRLF "\r\n"

DBUF(http, 4096);

typedef struct http_option_t {
    char *name;
    char *value;
} http_option_t;

DTAB(option, http_option_t);

typedef struct http_client_t {
    dbuf_t(http)      *buf;
    int                pos;
    int                http_major;
    int                http_minor;
    char*              action;
    char*              url;
    dtab_t(option)    *options;
} http_client_t;

static int fd_src = 0;

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

    hclt->action = strtok_r(request, " ", &pos);
    hclt->url    = strtok_r(NULL,    " ", &pos);
    http_version = strtok_r(NULL,    " ", &pos);

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
        "Connection: closed" CRLF
        "Content-Type: audio/mpeg" CRLF
        CRLF;
    hclt = hclt;

    xsend(pfd->fd, header, sizeof(header)-1, 0);
}

void client_callback(int nevt, struct pollfd *pfd, void *data)
{
    int                     size;
    int                     s;
    http_client_t          *hclt;
    char                   *header;

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
            event_unregister(nevt);
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
        char buffer[4096];
        int  size;

        do {
            size = read(fd_src, buffer, sizeof(buffer));
            if(size <= 0)
            {
                if(errno == EINTR)
                    continue;
                xclose(pfd->fd);
                event_unregister(nevt);
                printf("SHUTDOWN\n");
                break;
            } else {
                xsend(pfd->fd, buffer, size, 0);
            }
        }
        while(0);
    }
    if(pfd->revents & POLLERR || pfd->revents & POLLHUP)
    {
        xclose(pfd->fd);
        event_unregister(nevt);
        printf("SHUTDOWN\n");
    }
}

void srv_callback(int next, struct pollfd *pfd, void *data)
{
    struct sockaddr_in      addr;
    int                     sck;
    http_client_t          *hclt;

    next = next;
    data = data;

    sck = xaccept(pfd->fd, &addr);
    if(sck == -1 || xsetnonblock(sck) == -1)
    {
        return;
    }

    hclt              = (http_client_t*) malloc(sizeof(http_client_t));
    hclt->buf         = dbuf_init(http);
    hclt->pos         = 0;
    hclt->options     = dtab_init(option);

    event_register_fd(sck, &client_callback, POLLIN, hclt);
}

int main(int argc, char *argv[]) {
    int srv;

    if(argc > 1)
    {
        fd_src = open(argv[1], O_RDONLY);
	if(fd_src == -1)
	  fd_src = 0;
    }

    event_init();
    srv = xlisten(6080);
    event_register_fd(srv, &srv_callback, POLLIN, NULL);
    event_loop();

    return 0;
}
