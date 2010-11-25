#ifndef __EVENT_H__
#define __EVENT_H__

#include <poll.h>

typedef void event_f(int nevt, struct pollfd *pfd, void *data);

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

    void event_init(void);
    void event_unregister(int nevt);
    void event_register_fd(int fd, event_f *fnc, short event, void *data);
    void event_loop(void);
    void event_exit(void);

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* __EVENT_H__ */
