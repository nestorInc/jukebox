#ifndef __EVENT_H__
#define __EVENT_H__

#include <poll.h>

struct event_t;

typedef struct event_t event_t;

typedef void event_f(event_t *ev, void *data);

typedef enum event_kind_t {
    EVENT_KIND_UNDEF = 0,
    EVENT_KIND_FD,
    EVENT_KIND_TIMER,
} event_kind_t;


#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

    void event_init(void);
    void event_loop(void);
    void event_exit(void);

    event_t * event_fd_register(int fd, short event, event_f *fnc, void *data);
    event_t * event_timer_register(unsigned int next, int repeat, event_f *fnc, void *data);

    struct pollfd * event_fd_get_pfd(event_t *ev);
    event_kind_t    event_get_kind(event_t *ev);
    void event_unregister(event_t *ev);

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* __EVENT_H__ */
