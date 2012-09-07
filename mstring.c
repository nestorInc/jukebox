#include <stdlib.h>

#include "mstring.h"

#define STRING_MINIMUM_ALLOC_SIZE 16

string_t string_expand(string_t str, size_t len)
{
    size_t   alloc_size;
    string_t ret;

    if(len) {
        alloc_size = (len - 1) / STRING_MINIMUM_ALLOC_SIZE;
        alloc_size = (len + 1) * STRING_MINIMUM_ALLOC_SIZE;
    } else {
        alloc_size = 0;
    }

    switch(str.alloc) {
    case STRING_ALLOC_DYNAMIC:
        ret.txt   = realloc(str.txt, alloc_size);
        ret.len   = str.len;
        ret.size  = alloc_size;
        ret.alloc = STRING_ALLOC_DYNAMIC;
        break;

    case STRING_ALLOC_STATIC:
        ret.txt   = malloc(alloc_size);
        ret.len   = str.len;
        ret.size  = alloc_size;
        ret.alloc = STRING_ALLOC_DYNAMIC;

        memcpy(ret.txt, str.txt, str.len + 1);
        break;
    }

    return ret;
}



string_t string_concat(string_t str1, string_t str2)
{
    if(str1.size < str1.len + str2.len + 1) {
        str1 = string_expand(str1, str1.len + str2.len + 1);
    }

    memcpy(str1.txt + str1.len, str2.txt, str2.len);
    str1.len           += str2.len;
    str1.txt[str1.len]  = 0;

    return str1;
}

string_t string_chr(string_t str, char c)
{
    if(str.size < str.len + 1 + 1)
        str = string_expand(str, str.len + 1 + 1);

    str.txt[str.len++] = c;
    str.txt[str.len]   = 0;

    return str;
}

