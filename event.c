#include <poll.h>
#include <assert.h>
#include <errno.h>

#include "dtab.h"
#include "event.h"

typedef enum event_kind_t
{
    EVENT_KIND_FD,
    EVENT_KIND_TIMER
} event_kind_t;

typedef struct event_fd_t
{
    event_f *fnc;
    void    *data;
} event_fd_t;

typedef struct event_timer_t
{
} event_timer_t;

typedef struct event_t
{
    event_kind_t        kind;
    union {
        event_fd_t      event_fd;
        event_timer_t   event_timer;
    };
} event_t;

DTAB(pollfd, struct pollfd);
DTAB(event,  event_t);

static dtab_t(pollfd) *fds        = NULL;
static dtab_t(event)  *events     = NULL;
static int             noexit     = 1;

void event_init(void)
{
    fds      = dtab_init(pollfd);
    events   = dtab_init(event);
}

void event_unregister(int nevt)
{
    assert(nevt < fds->size && nevt >= 0); 

    dtab_del(pollfd, fds,    nevt);
    dtab_del(event,  events, nevt);
}

void event_register_fd(int fd, event_f *fnc, short event, void *data)
{
    struct pollfd  *pfd;
    event_t        *pevt;

    assert(fd   >= 0);
    assert(fnc  != NULL);

    pfd  = dtab_add(pollfd, fds,    NULL);
    pevt = dtab_add(event,  events, NULL);

    pfd->fd         = fd; 

    pfd->events     = event;

    pevt->kind               = EVENT_KIND_FD;
    pevt->event_fd.fnc       = fnc;
    pevt->event_fd.data      = data;
}

void event_register_timer(int fd, event_f *fnc, short event, void *data)
{
    fd =fd;
    fnc= fnc;
    event= event;
    data=data;
}

void event_exit(void)
{
    noexit = 0;
}

void event_loop(void)
{
    int                 v;
    int                 i;
    struct pollfd      *pfd;
    event_t            *pevt;
    short               evt;

    assert(fds);
    assert(events);

    while(noexit)
    {
        v = poll(fds->data, fds->size, -1);
        if(v == -1)
        {
            if(errno == EINTR)
                continue; 
            break;
        }
        if(v == 0) // timeout
            continue;

        dtab_for_each(pollfd, fds, pfd)
        {
            evt  = pfd->revents;
            pevt = dtab_get(event, events, i); 
            if(evt)
            {
                if(pevt->event_fd.fnc)
                {
                    pevt->event_fd.fnc(i, pfd, pevt->event_fd.data);
                }
                v--;
            }
            if(v == 0)
                break;
        }
    }
}
