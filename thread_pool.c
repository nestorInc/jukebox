#include <pthread.h>

#include "thread_pool.h"
#include "vector.h"

typedef struct thread_cmd_t {
    thread_f             fn;
    void                *data;
} thread_cmd_t;

VECTOR_T(thread, thread_cmd_t);

typedef struct queue {
    pthread_mutex_t mutex;
    pthread_cond_t  cond;
    vector_thread_t cmd;
} queue_t;

void queue_init(queue_t *q)
{
    vector_thread_init(&q->cmd);
    pthread_cond_init(&q->cond, NULL);
    pthread_mutex_init(&q->mutex, NULL);
}

void queue_add(queue_t *q, thread_cmd_t *cmd)
{
    pthread_mutex_lock(&q->mutex);
    vector_thread_push(&q->cmd, cmd);
    pthread_cond_signal(&q->cond);
    pthread_mutex_unlock(&q->mutex);
}

void queue_get(queue_t *q, thread_cmd_t *cmd)
{
    pthread_mutex_lock(&q->mutex);
    while(vector_thread_shift(&q->cmd, cmd) == -1)
        pthread_cond_wait(&q->cond, &q->mutex);
    pthread_mutex_unlock(&q->mutex);
}

struct thread_pool_t {
    int             n;
    queue_t         q;
    pthread_mutex_t mutex;
    pthread_cond_t  cond;
};

void thread_pool_wait(thread_pool_t *pool)
{
    thread_cmd_t cmd = { .fn = NULL };
    int          i;

    pthread_mutex_lock(&pool->mutex);
    for(i = 0; i < pool->n; ++i)
        queue_add(&pool->q, &cmd);

    while(pool->n)
        pthread_cond_wait(&pool->cond, &pool->mutex); 

    pthread_mutex_unlock(&pool->mutex);
}

void thread_pool_add(thread_pool_t *pool, thread_f fn, void *data)
{
    thread_cmd_t c = { .fn   = fn,
                       .data = data };
    if(fn != NULL)
        queue_add(&pool->q, &c);
}

static void * thread_pool_process(thread_pool_t *pool)
{
    int running = 1;

    while(running) {
        thread_cmd_t cmd;

        queue_get(&pool->q, &cmd);

        if(cmd.fn == NULL) { /* Terminate thread */
            running = 0;
            continue;
        }

        cmd.fn(cmd.data);
    }

    pthread_mutex_lock(&pool->mutex);
    pool->n--;
    pthread_cond_signal(&pool->cond);
    pthread_mutex_unlock(&pool->mutex);

    return NULL;
}

static void thread_pool_init(thread_pool_t *pool, int n)
{
    int i;

    pthread_cond_init(&pool->cond, NULL);
    pthread_mutex_init(&pool->mutex, NULL);
    queue_init(&pool->q);
    pool->n = n;

    for(i = 0; i < n; ++i) {
        pthread_t th;
        pthread_create(&th, NULL, (void * (*)(void *))thread_pool_process, pool);
        pthread_detach(th);
    }
}

thread_pool_t * thread_pool_new(int n)
{
    thread_pool_t *pool;

    pool = (thread_pool_t*) malloc(sizeof(thread_pool_t));

    thread_pool_init(pool, n);

    return pool;
}
