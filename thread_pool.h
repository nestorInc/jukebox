#ifndef __THREAD_POOL_H__
#define __THREAD_POOL_H__

typedef void (*thread_f)(void *data);

typedef struct thread_pool_t thread_pool_t;

// Creation new thread_pool
thread_pool_t * thread_pool_new(int nb_thread);

// Add jobs on thread pool
void thread_pool_add(thread_pool_t *pool, thread_f fn, void *data);

// Wait all jobs on thread pool
void thread_pool_wait(thread_pool_t *pool);

#endif /* __THREAD_POOL_H__ */
