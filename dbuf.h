#ifndef __DBUF_H__
#define __DBUF_H__

#include <assert.h>
#include <stdlib.h>

#define dbuf_t(name)                                                    \
  dbuf_##name##_t

#define DBUF(name, incr)                                                \
  typedef struct dbuf_t(name) {                                         \
      int      len;                                                     \
      int      size;                                                    \
      uint8_t* data;                                                    \
  } dbuf_t(name);                                                       \
                                                                        \
  dbuf_t(name)* dbuf_##name##_init(void)                                \
  {                                                                     \
      dbuf_t(name)* dbuf;                                               \
      dbuf = (dbuf_t(name)*)malloc(sizeof(dbuf_t(name)));               \
      dbuf->len  = 0;                                                   \
      dbuf->size = 0;                                                   \
      dbuf->data = NULL;                                                \
      return dbuf;                                                      \
  }                                                                     \
                                                                        \
  uint8_t* dbuf_##name##_add(dbuf_t(name)* dbuf, int size)              \
  {                                                                     \
      int extra;                                                        \
      int nb_chunk;                                                     \
      int pos;                                                          \
                                                                        \
      assert(size > 0);                                                 \
      extra = dbuf->len - dbuf->size;                                   \
      if(extra < size)                                                  \
      {                                                                 \
          nb_chunk    = size - extra - 1;                               \
          nb_chunk   /= incr;                                           \
          nb_chunk++;                                                   \
          dbuf->len  += nb_chunk*incr;                                  \
          dbuf->data  = realloc(dbuf->data, dbuf->len);                 \
      }                                                                 \
                                                                        \
      pos         = dbuf->size;                                         \
      dbuf->size += size;                                               \
                                                                        \
      return &dbuf->data[pos];                                          \
  }                                                                     \
                                                                        \
  void dbuf_##name##_setsize(dbuf_t(name)* dbuf, int size)              \
  {                                                                     \
      assert(size >= 0);                                                \
      assert(size <= dbuf->size);                                       \
      dbuf->size = size;                                                \
  }                                                                     \
                                                                        \
  int dbuf_##name##_getsize(dbuf_t(name)* dbuf)                         \
  {                                                                     \
      return dbuf->size;                                                \
  }                                                                     \
                                                                        \
  uint8_t* dbuf_##name##_getbuffer(dbuf_t(name)* dbuf)                  \
  {                                                                     \
      return dbuf->data;                                                \
  }


#define dbuf_init(name)                                                 \
    dbuf_##name##_init()

#define dbuf_add(name, dbuf, size)                                      \
    dbuf_##name##_add(dbuf, size)

#define dbuf_setsize(name, dbuf, size)                                  \
    dbuf_##name##_setsize(dbuf, size)

#define dbuf_getsize(name, dbuf)                                        \
    dbuf_##name##_getsize(dbuf)

#define dbuf_getbuffer(name, dbuf)                                      \
    dbuf_##name##_getbuffer(dbuf)

#endif /* __DBUF_H__ */

