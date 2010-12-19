#include "mem-chunk.h"

#include <assert.h>

#include "mem.h"
#include "dlist.h"

#define MEM_CHUNK_GET(mc, i)                                            \
    (mc->data + (mc->size + sizeof(dlist_t)) * (i))

typedef struct mem_chunk_item_t {
    dlist_t free;
    char    data[];
} mem_chunk_item_t;

mem_chunk_t * mem_chunk_new(int size, int nb)
{
    mem_chunk_t *ret;

    ret = m_alloc(mem_chunk_t);
    mem_chunk_init(ret, size, nb);

    return ret;
}

void mem_chunk_delete(mem_chunk_t *mc)
{
    assert(mc);

    mem_chunk_clean(mc);
    m_release(mc);
}

void mem_chunk_init(mem_chunk_t *mc, int size, int nb)
{
    int                  i;
    mem_chunk_item_t    *mci;

    assert(mc);
    assert(size > 0);
    assert(nb   > 0);

    mc->size = size;
    mc->nb   = nb;
    mc->data = ma_alloc(char, nb*(size + sizeof(dlist_t)));
    dlist_init(&mc->free);

    for(i = 0; i < nb; ++i) {
        mci = MEM_CHUNK_GET(mc, i);
        dlist_add_prev(&mc->free, &mci->free);
    }
    
}

void mem_chunk_clean(mem_chunk_t *mc)
{
    assert(mc);

    mc->size = 0;
    mc->nb   = 0;
    ma_release(mc->data);
}

void * mem_chunk_alloc(mem_chunk_t *mc)
{
    mem_chunk_item_t    *mci;

    assert(mc);

    mci = (mem_chunk_item_t*) dlist_pop(&mc->free);

    if(mci == NULL)
        return NULL;

    return mci->data;
}

void mem_chunk_free(mem_chunk_t *mc, void *data)
{
    mem_chunk_item_t    *mci;

    assert(mc);
    assert(data);

    mci = (mem_chunk_item_t*)(((char*)data) - sizeof(dlist_t));

    dlist_add_prev(&mc->free, &mci->free);
}
