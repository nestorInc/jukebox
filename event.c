#include <poll.h>
#include <assert.h>
#include <errno.h>
#include <sys/time.h>
#include <stdint.h>

#include "mem.h"
#include "dlist.h"
#include "dtab.h"
#include "event.h"

#define MIN(a, b) ((a) < (b)) ? (a) : (b)

typedef struct event_fd_t
{
    int ipfd;
} event_fd_t;

typedef struct event_timer_t
{
    struct timeval  tm;
    unsigned int    next;
} event_timer_t;

typedef union event_opt_t {
    event_timer_t timer;
    event_fd_t    fd;
} event_opt_t;

struct event_t {
    dlist_t         dlist;
    event_kind_t    kind;

    event_f        *fnc;
    void           *data;

    event_opt_t     opt;
}; 

DTAB(pollfd,  struct pollfd);

static dtab_t(pollfd)   *fds        = NULL;
static dlist_t           events_fd;
static dlist_t           events_tm;
static int               noexit     = 1;

static inline int64_t timeval_cmp(struct timeval *tv1, struct timeval *tv2)
{
    return ((int64_t)tv2->tv_sec * 1000000 + tv2->tv_usec)
        -  ((int64_t)tv1->tv_sec * 1000000 + tv1->tv_usec);
}

static inline void timeval_add(struct timeval *tv, int v)
{
    tv->tv_sec  += v / 1000000; 
    tv->tv_usec += v % 1000000; 

    if(tv->tv_usec > 1000000) {
        tv->tv_sec  ++;
        tv->tv_usec -= 1000000;
    }
}

void event_init(void)
{
    fds = dtab_init(pollfd);
    dlist_init(&events_fd);
    dlist_init(&events_tm);
}

event_kind_t    event_get_kind(event_t *ev)
{
    assert(ev);

    return ev->kind;
}

void event_unregister(event_t *ev)
{
    event_t          *cur_evt; 

    assert(ev);

    switch(ev->kind) {
    case EVENT_KIND_FD:
        dtab_del(pollfd, fds, ev->opt.fd.ipfd);

        dlist_for_each(&events_fd) {
            cur_evt = (struct event_t *)cur;
            if(cur_evt->opt.fd.ipfd == fds->size) {
                cur_evt->opt.fd.ipfd = ev->opt.fd.ipfd;
                break;
            }
        }
        break;

    case EVENT_KIND_TIMER:
        break;

    default:
        assert(0);
    }
    
    ev->kind = EVENT_KIND_UNDEF;
    m_release(dlist_del(&ev->dlist));
}

event_t * event_timer_register(unsigned int next, int repeat, event_f *fnc, void *data)
{
    event_t     *pevt;

    assert(next != 0);
    assert(fnc  != NULL);

    pevt = m_alloc(event_t);

    gettimeofday(&pevt->opt.timer.tm, NULL);
    timeval_add(&pevt->opt.timer.tm, next*1000);
    if(repeat) {
        pevt->opt.timer.next = next;
    } else {
        pevt->opt.timer.next = 0;
    }
    pevt->fnc       = fnc;
    pevt->data      = data;
    pevt->kind      = EVENT_KIND_TIMER;

    dlist_add_prev(&events_tm, &pevt->dlist);

    return pevt;
}

event_t * event_fd_register(int fd, short event, event_f *fnc, void *data)
{
    struct pollfd  *pfd;
    event_t        *pevt;

    assert(fd   >= 0);
    assert(fnc  != NULL);

    pevt = m_alloc(event_t);
    pfd  = dtab_add(pollfd,  fds, NULL);
    dlist_add_prev(&events_fd, &pevt->dlist);

    pfd->fd           = fd; 
    pfd->events       = event;

    pevt->opt.fd.ipfd = dtab_get_index(pollfd, fds, pfd);
    pevt->fnc         = fnc;
    pevt->data        = data;
    pevt->kind        = EVENT_KIND_FD;

    assert(pevt->opt.fd.ipfd != -1);

    return pevt;
}

struct pollfd * event_fd_get_pfd(event_t *ev)
{
    assert(ev);
    assert(ev->kind == EVENT_KIND_FD);

    return dtab_get(pollfd, fds, ev->opt.fd.ipfd);
}

void event_exit(void)
{
    noexit = 0;
}

static int event_check_timer(void)
{
    struct timeval      tm;
    int64_t             diff;
    uint64_t            next;
    event_t            *pevt;

    next = (unsigned)-1;

    gettimeofday(&tm, NULL);

    dlist_for_each(&events_tm) {
        pevt = (event_t*)cur;
        diff = timeval_cmp(&tm, &pevt->opt.timer.tm);
        if(diff < 1000) { // expired
            if(pevt->opt.timer.next) {
                diff += pevt->opt.timer.next*1000;
                timeval_add(&pevt->opt.timer.tm, pevt->opt.timer.next*1000);
                pevt->fnc(pevt, pevt->data);
            } else {
                diff = (unsigned) -1;
                pevt->fnc(pevt, pevt->data);
                event_unregister(pevt);
            }
        }
        assert(diff > 0);
        next = MIN((unsigned)diff, next);
    }
    return (int)(next / 1000);
}

void event_loop(void)
{
    int                 v;
    event_t            *pevt;
    short               evt;
    int                 timeout;

    assert(fds);

    while(noexit)
    {
        timeout = event_check_timer();

        v = poll(fds->data, fds->size, timeout);
        if(v == -1)
        {
            if(errno == EINTR)
                continue; 
            break;
        }

        if(v == 0) // timeout
        {
            continue;
        }

        dlist_for_each(&events_fd)
        {
            pevt    = (event_t*) cur; 
            evt     = event_fd_get_pfd(pevt)->revents;
            if(evt)
            {
                pevt->fnc(pevt, pevt->data);
                v--;
            }
            if(v == 0)
                break;
        }
    }
}
