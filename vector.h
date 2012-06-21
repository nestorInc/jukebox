#ifndef _VECTOR_H_
#define _VECTOR_H_

#include <stdlib.h>


#define VECTOR_T(type)                                                  \
                                                                        \
typedef struct vector_##type##_t {                                      \
    type        *data;                                                  \
    int          len;                                                   \
    int          size;                                                  \
} vector_##type##_t;                                                    \
                                                                        \
                                                                        \
static vector_##type##_t * vector_##type##_new(void)                    \
{                                                                       \
    vector_##type##_t *ret;                                             \
                                                                        \
    ret = (vector_##type##_t *) malloc(sizeof(vector_##type##_t));      \
    memset(ret, 0, sizeof(vector_##type##_t));                          \
                                                                        \
    return ret;                                                         \
}                                                                       \
                                                                        \
static type * vector_##type##_push(vector_##type##_t *v, type *d)       \
{                                                                       \
    type *ret;                                                          \
                                                                        \
    if(v->len == v->size) {                                             \
        v->size = (v->size == 0) ? 8 : (v->size << 1);                  \
        v->data = realloc(v->data, v->size * sizeof(type));             \
    }                                                                   \
                                                                        \
    ret = &v->data[v->len];                                             \
    v->len++;                                                           \
                                                                        \
    *ret = *d;                                                          \
                                                                        \
    return ret;                                                         \
}                                                                       \
                                                                        \
static void vector_##type##_clean(vector_##type##_t *v)                 \
{                                                                       \
    free(v->data);                                                      \
    v->len  = 0;                                                        \
    v->size = 0;                                                        \
}                                                                       \
                                                                        \
static void vector_##type##_free(vector_##type##_t *v)                  \
{                                                                       \
    vector_##type##_clean(v);                                           \
    free(v);                                                            \
}                                                                       \

#endif // _VECTOR_H_
