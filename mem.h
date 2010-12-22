#ifndef __MEM_H__
#define __MEM_H__

#include <stdlib.h>


#define m_alloc(type) ((type*)malloc(sizeof(type)))
#define ma_alloc(type, size) ((type*)malloc(sizeof(type)*size))

#define m_realloc(data, type) ((type*)realloc(data, sizeof(type)))
#define ma_realloc(data, type, size) ((type*)realloc(data, sizeof(type)*size))

#define m_release(data) free(data)
#define ma_release(data) free(data)

#endif /* __MEM_H__ */
