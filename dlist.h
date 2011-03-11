#ifndef __DLIST_H__
#define __DLIST_H__

#include <stdlib.h>

typedef struct dlist_t {
    struct dlist_t *prev;
    struct dlist_t *next;
} dlist_t;

static inline void dlist_init(dlist_t *e)
{
    e->prev = e;
    e->next = e;
}

static inline void dlist_add_next(dlist_t *h, dlist_t *e)
{
    e->next       = h->next;
    e->prev       = h;
    e->prev->next = e;
    e->next->prev = e;
}

static inline void dlist_add_prev(dlist_t *h, dlist_t *e)
{
    e->next       = h;
    e->prev       = h->prev;
    e->prev->next = e;
    e->next->prev = e;
}

static inline int dlist_is_empty(dlist_t *h)
{
    return h->next == h->prev;
}

static inline struct dlist_t * dlist_del(struct dlist_t *e)
{
    e->prev->next = e->next;
    e->next->prev = e->prev;

    dlist_init(e);

    return e;
}

static inline dlist_t * dlist_pop(dlist_t *h)
{
    if(dlist_is_empty(h))
        return NULL;

    return dlist_del(h->prev);
}

#define dlist_for_each(h)                                               \
    for(dlist_t *cur = (h)->next, *_next = cur->next; cur != (h); cur = _next, _next = cur->next)

#endif /* __DLIST_H__ */
