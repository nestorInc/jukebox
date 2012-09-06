#ifndef _VECTOR_H_
#define _VECTOR_H_

#include <stdlib.h>
#include <string.h>


#define VECTOR_T(name, type)                                            \
                                                                        \
typedef struct vector_##name {                                          \
    type        *data;                                                  \
    int          offset;                                                \
    int          len;                                                   \
    int          size;                                                  \
} vector_##name##_t;                                                    \
                                                                        \
                                                                        \
__attribute__((used))                                                   \
static void vector_##name##_init(vector_##name##_t *v)                  \
{                                                                       \
    memset(v, 0, sizeof(vector_##name##_t));                            \
}                                                                       \
                                                                        \
__attribute__((used))                                                   \
static vector_##name##_t * vector_##name##_new(void)                    \
{                                                                       \
    vector_##name##_t *ret;                                             \
                                                                        \
    ret = (vector_##name##_t *) malloc(sizeof(vector_##name##_t));      \
    vector_##name##_init(ret);                                          \
                                                                        \
    return ret;                                                         \
}                                                                       \
                                                                        \
__attribute__((used))                                                   \
static type * vector_##name##_push(vector_##name##_t *v, type *d)       \
{                                                                       \
    type *ret;                                                          \
                                                                        \
    if(v->offset + v->len == v->size) {                                 \
        if(v->size && (v->offset << 1) >= v->size) {                    \
            memmove(v->data, &v->data[v->offset],                       \
                    v->len * sizeof(type));                             \
            v->offset = 0;                                              \
        } else {                                                        \
            v->size = (v->size == 0) ? 8 : (v->size << 1);              \
            v->data = realloc(v->data, v->size * sizeof(type));         \
        }                                                               \
    }                                                                   \
                                                                        \
    ret = &v->data[v->offset + v->len];                                 \
    v->len++;                                                           \
                                                                        \
    *ret = *d;                                                          \
                                                                        \
    return ret;                                                         \
}                                                                       \
                                                                        \
__attribute__((used))                                                   \
static int vector_##name##_pop(vector_##name##_t *v, type *d)           \
{                                                                       \
    if(v->len == 0)                                                     \
        return -1;                                                      \
                                                                        \
    --v->len;                                                           \
    *d = v->data[v->offset + v->len];                                   \
                                                                        \
    return 0;                                                           \
}                                                                       \
                                                                        \
__attribute__((used))                                                   \
static int vector_##name##_shift(vector_##name##_t *v, type *d)         \
{                                                                       \
    if(v->len == 0)                                                     \
        return -1;                                                      \
                                                                        \
    *d = v->data[v->offset++];                                          \
    v->len--;                                                           \
                                                                        \
    if(v->len == 0)                                                     \
        v->offset = 0;                                                  \
    return 0;                                                           \
}                                                                       \
                                                                        \
__attribute__((used))                                                   \
static void vector_##name##_clean(vector_##name##_t *v)                 \
{                                                                       \
    free(v->data);                                                      \
    v->len    = 0;                                                      \
    v->size   = 0;                                                      \
    v->offset = 0;                                                      \
}                                                                       \
                                                                        \
__attribute__((used))                                                   \
static void vector_##name##_free(vector_##name##_t *v)                  \
{                                                                       \
    vector_##name##_clean(v);                                           \
    free(v);                                                            \
}                                                                       \

#endif // _VECTOR_H_
