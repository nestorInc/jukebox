#define _BSD_SOURCE 1

#include <errno.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>

#include "sck.h"

static int newsock(void)
{
    return socket (AF_INET, SOCK_STREAM, 0);
}

int xlisten(const short port)
{
    int                s;
    struct sockaddr_in addr;
    int                opt = 1;

    s = newsock ();
    if (s < 0)
        return -1;
    addr.sin_family = AF_INET;
    addr.sin_port = htons (port);
    addr.sin_addr.s_addr = htonl (INADDR_ANY);
    if (bind (s, (struct sockaddr *) &addr, sizeof (addr)) == -1)
        return -1;
    if(setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &opt,sizeof(opt)) == -1)
        return -1;
    if (listen (s, 5) == -1)
        return -1;
    return s;
}

int xaccept(int s, struct sockaddr_in *addr)
{
    int addrlen =  sizeof (struct sockaddr_in);
    return accept (s, (struct sockaddr *) addr, (unsigned int *)&addrlen);
}

int xconnect (const char *addr, const short port, const short local_port)
{
    int                 s;
    struct sockaddr_in  remote_sockaddr;
    struct sockaddr_in  local_sockaddr;
    struct hostent     *hostent;
    int                 opt;
    s = newsock();
    if (!(hostent = gethostbyname (addr)))
        return -1;
    if(local_port) {
        memset(&local_sockaddr, 0, sizeof(local_sockaddr));
        local_sockaddr.sin_family      = AF_INET;
        local_sockaddr.sin_port        = htons(local_port);
        local_sockaddr.sin_addr.s_addr = INADDR_ANY;
        if(bind(s, (struct sockaddr *)&local_sockaddr,
                sizeof(local_sockaddr)) == -1)
            return -1;
    }
    memset(&remote_sockaddr, 0, sizeof(remote_sockaddr));
    remote_sockaddr.sin_addr.s_addr = *((long *) hostent->h_addr);
    remote_sockaddr.sin_port        = htons (port);
    remote_sockaddr.sin_family      = AF_INET;

    opt = 1;
    if(setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &opt,sizeof(opt)) == -1)
        return -1;

    if(connect (s, (struct sockaddr *) &remote_sockaddr,
                sizeof (struct sockaddr)) == -1)
        return -1;
    return s;
}

#include <stdio.h>

ssize_t xrecv(int s, void *buffer, const size_t length, int flags)
{
    ssize_t ret;

    do {
        ret = recv(s, buffer, length, flags);
    } while(ret == -1 && errno == EAGAIN);

    if(ret != (signed)length)
        printf("incomplete recv %ji/%ji\n", ret, length);

    return ret;
}

ssize_t xsend(int s, const void *buffer, const size_t length, int flags)
{
    ssize_t ret;

    do {
        ret = send(s, buffer, length, flags);
    } while(ret == -1 && errno == EAGAIN);

    if(ret != (signed)length)
        printf("incomplete send %ji/%ji\n", ret, length);

    return ret;
}

void xclose(int s)
{
    shutdown(s, SHUT_RDWR);
    close(s);
}

int xsetnonblock(int s)
{
    int opt;
    do {
        opt = fcntl(s, F_GETFL);
        if(opt == -1)
        {
            if(errno == EINTR)
                continue;
            return -1;
        }
    } while(0);
    opt |= O_NONBLOCK;
    return fcntl(s, F_SETFL, opt);
}
