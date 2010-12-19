#ifndef __MEM_CHUNK__
#define __MEM_CHUNK__

#include "dlist.h"

typedef struct mem_chunk_t {
    int      size;
    int      nb;
    dlist_t  free;
    void    *data;
} mem_chunk_t;

mem_chunk_t * mem_chunk_new(int size, int nb);

void mem_chunk_delete(mem_chunk_t *mc);

void mem_chunk_init(mem_chunk_t *mc, int size, int nb);

void mem_chunk_clean(mem_chunk_t *mc);

void* mem_chunk_alloc(mem_chunk_t *mc);

void mem_chunk_free(mem_chunk_t *mc, void *data);

#endif /* __MEM_CHUNK__ */
