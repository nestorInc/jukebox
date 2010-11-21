#ifndef _SCK_H_
#define _SCK_H_

#include <netdb.h>

#ifdef __cplusplus
extern "C"
{
#endif

    int     xlisten(const short port);
    int     xconnect(const char *addr, const short port, const short local_port);
    int     xaccept(int s, struct sockaddr_in *);
    ssize_t xrecv(int s, void *buffer, const size_t length, int flags);
    ssize_t xsend(int s, const const void *buffer, const size_t length, int flags);
    int     xsetnonblock(int s);
    void    xclose(int s);

#ifdef __cplusplus
}
#endif

#endif
