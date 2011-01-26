#ifndef __DTAB_H__
#define __DTAB_H__

#include <stdlib.h>

#define dtab_t(name)                                                    \
  dtab_##name##_t

#define DTAB(name, type)                                                \
  typedef struct dtab_t(name) {                                         \
      int   len;                                                        \
      int   size;                                                       \
      type* data;                                                       \
  } dtab_t(name);                                                       \
                                                                        \
  dtab_t(name)* dtab_##name##_init(void)                                \
  {                                                                     \
      dtab_t(name)* dtab;                                               \
      dtab = (dtab_t(name)*)malloc(sizeof(dtab_t(name)));               \
      dtab->len  = 0;                                                   \
      dtab->size = 0;                                                   \
      dtab->data = NULL;                                                \
      return dtab;                                                      \
  }                                                                     \
                                                                        \
  type* dtab_##name##_add(dtab_t(name)* dtab, type* data)               \
  {                                                                     \
      if(dtab->size == dtab->len)                                       \
      {                                                                 \
          dtab->len += 8;                                               \
          dtab->data = realloc(dtab->data, dtab->len*sizeof(dtab_t(name))); \
      }                                                                 \
                                                                        \
      if(data)                                                          \
      {                                                                 \
          dtab->data[dtab->size] = *data;                               \
      }                                                                 \
      dtab->size++;                                                     \
                                                                        \
      return &dtab->data[dtab->size-1];                                 \
  }                                                                     \
                                                                        \
  int dtab_##name##_get_index(dtab_t(name)* dtab, type* data)           \
  {                                                                     \
      int pos;                                                          \
      pos = (data - dtab->data);                                        \
      if(pos < 0 || pos >= dtab->size)                                  \
          return -1;                                                    \
      return pos;                                                       \
  }                                                                     \
                                                                        \
  type* dtab_##name##_get(dtab_t(name)* dtab, int pos)                  \
  {                                                                     \
      if(pos < 0 || pos >= dtab->size)                                  \
          return NULL;                                                  \
      return &dtab->data[pos];                                          \
  }                                                                     \
                                                                        \
  int dtab_##name##_del_at(dtab_t(name)* dtab, int pos)                 \
  {                                                                     \
      if(pos >= dtab->size)                                             \
          return -1;                                                    \
                                                                        \
      dtab->size--;                                                     \
      if(dtab->size != pos) {                                           \
          dtab->data[pos] = dtab->data[dtab->size];                     \
      }                                                                 \
      if(dtab->len - dtab->size >= 8) {                                 \
          dtab->len -= 8;                                               \
          dtab->data = realloc(dtab->data, dtab->len*sizeof(type));     \
      }                                                                 \
      return 0;                                                         \
  }                                                                     \
                                                                        \
  void dtab_##name##_clean(dtab_t(name)* dtab)                          \
  {                                                                     \
      if(dtab->data)                                                    \
          free(dtab->data);                                             \
      free(dtab);                                                       \
  }



#define dtab_init(name)                                                 \
  dtab_##name##_init()

#define dtab_add(name, dtab, data)                                      \
    dtab_##name##_add(dtab, data)

#define dtab_del_at(name, dtab, pos)                                    \
    dtab_##name##_del_at(dtab, pos)

/* #define dtab_del(name, dtab, data)                                      \ */
/*     dtab_##name##_del(dtab, data) */
/*   int dtab_##name##_del(dtab_t(name)* dtab, type* data)                 \ */
/*   {                                                                     \ */
/*       dtab->size--;                                                     \ */
/*       if(dtab->size != pos) {                                           \ */
/*           dtab->data[pos] = dtab->data[dtab->size];                     \ */
/*       }                                                                 \ */
/*       if(dtab->len - dtab->size >= 8) {                                 \ */
/*           dtab->len -= 8;                                               \ */
/*           dtab->data = realloc(dtab->data, dtab->len*sizeof(type));     \ */
/*       }                                                                 \ */
/*       return 0;                                                         \ */
/*   }                                                                     \ */
/*                                                                         \ */

#define dtab_get(name, dtab, pos)                                       \
    dtab_##name##_get(dtab, pos)

#define dtab_get_index(name, dtab, data)                                \
    dtab_##name##_get_index(dtab, data)

#define dtab_clean(name, dtab)                                          \
  dtab_##name##_clean(dtab)

#define dtab_for_each(name, dtab, __data)                               \
    for(i = dtab->size, __data = &dtab->data[dtab->size - 1];           \
        i--; --__data)

#endif /* __DTAB_H__ */
