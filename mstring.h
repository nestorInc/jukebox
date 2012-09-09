#ifndef __MSTRING_H__
#define __MSTRING_H__

#include <stdint.h>
#include <string.h>
#include <stdio.h>

typedef enum string_alloc_t {
    STRING_ALLOC_DYNAMIC,
    STRING_ALLOC_STATIC,
} string_alloc_t;

typedef struct string_t {
    char        *txt;
    uint32_t     len  :14;
    uint32_t     size :14;
    uint32_t     alloc: 4;
} string_t;

static inline string_t string_init_full(char *txt, size_t len,
                                        size_t size, string_alloc_t alloc)
{
    string_t str = {
        .txt   = txt,
        .len   = len,
        .size  = size,
        .alloc = alloc
    };

    return str;
}

static inline string_t string_init_static(char *txt)
{
    size_t len;

    len = strlen(txt);

    return string_init_full(txt, len, len, STRING_ALLOC_STATIC);
}

static inline string_t string_init(char *txt)
{
    size_t len;

    len = strlen(txt);

    return string_init_full(txt, len, len, STRING_ALLOC_DYNAMIC);
}

static inline void string_clean(string_t *str)
{
    switch(str->alloc) {
    case STRING_ALLOC_DYNAMIC:
        free(str->txt);
        break;

    case STRING_ALLOC_STATIC:
        break;
    }

    str->txt  = NULL;
    str->len  = 0;
    str->size = 0;
}

static inline string_t string_dup(string_t str)
{
    string_t ret;

    switch(str.alloc) {
    case STRING_ALLOC_DYNAMIC:
        ret.alloc = STRING_ALLOC_DYNAMIC;
        ret.size  = str.size;
        ret.len   = str.len;
        ret.txt   = malloc(str.size);

        memcpy(ret.txt, str.txt, ret.len + 1);
        break;

    case STRING_ALLOC_STATIC:
        ret = str;
        break;
    }
    return ret;
}

string_t string_concat(string_t txt1, string_t txt2);

string_t string_chr(string_t str, char c);

static inline void string_dump(string_t str)
{
    printf("%.*s\n", str.len, str.txt);
}

#endif /* __MSTRING_H__ */
