#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>
#include <sys/types.h>
#include <dirent.h>
#include <sys/stat.h>
#include <sys/wait.h>

#include "vector.h"
#include "mp3.h"

typedef struct thread_cmd {
    unsigned int         cmd;
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

#define JOBS_QUEUE_MAX_FUNC 16

typedef void (*thread_f)(void *data);

typedef struct jobs_queue {
    int             n;
    queue_t         q;
    pthread_mutex_t mutex;
    pthread_cond_t  cond;
    thread_f        func[JOBS_QUEUE_MAX_FUNC];
} jobs_queue_t;

void jobs_queue_wait(jobs_queue_t *jq)
{
    thread_cmd_t cmd = { .cmd = -1 };
    int          i;

    pthread_mutex_lock(&jq->mutex);
    for(i = 0; i < jq->n; ++i)
        queue_add(&jq->q, &cmd);

    while(jq->n)
        pthread_cond_wait(&jq->cond, &jq->mutex); 

    pthread_mutex_unlock(&jq->mutex);
}

void jobs_queue_add(jobs_queue_t *jq, int cmd, void *data)
{
    thread_cmd_t c = { .cmd  = cmd,
                       .data = data };
    if(cmd != -1 && cmd < JOBS_QUEUE_MAX_FUNC)
        queue_add(&jq->q, &c);
}

static void * jobs_queue_process(jobs_queue_t *jq)
{
    int running = 1;

    while(running) {
        thread_cmd_t cmd;

        queue_get(&jq->q, &cmd);

        if(cmd.cmd == (unsigned)-1) {
            running = 0;
            continue;
        }

        if(jq->func[cmd.cmd] == NULL)
            continue;

        jq->func[cmd.cmd](cmd.data);
    }

    pthread_mutex_lock(&jq->mutex);
    jq->n--;
    pthread_cond_signal(&jq->cond);
    pthread_mutex_unlock(&jq->mutex);

    return NULL;
}

void jobs_queue_init(jobs_queue_t *jq, int n)
{
    int i;

    pthread_cond_init(&jq->cond, NULL);
    pthread_mutex_init(&jq->mutex, NULL);
    queue_init(&jq->q);
    memset(jq->func, 0, sizeof(jq->func));
    jq->n = n;

    for(i = 0; i < n; ++i) {
        pthread_t th;
        pthread_create(&th, NULL, (void * (*)(void *))jobs_queue_process, jq);
        pthread_detach(th);
    }
}

int jobs_queue_func_add(jobs_queue_t *jq, thread_f fn)
{
    int i;

    for(i = 0; i < JOBS_QUEUE_MAX_FUNC; ++i)
        if(jq->func[i] == NULL)
            break;

    if(i == JOBS_QUEUE_MAX_FUNC)
        return -1;
    
    jq->func[i] = fn;

    return i;
}

typedef struct encode_file_t {
    char *src;
    char *dst;

    char  data[0];
} encode_file_t;

void encode_th(void *data)
{
    encode_file_t *enc          = data;
    char          *argv[8];
    int            pipedesc[2];
    int            pid_decoder;
    int            pid_encoder;
    mp3_info_t     info;
    int            ret;

    ret = mp3_info_decode(&info, enc->src);
    if(info.album  == NULL ||
       info.artist == NULL ||
       info.title  == NULL)
        ret = -2;

    switch(ret) {
    case -1:
        printf("Skip %s -> %s\n", enc->src, enc->dst);
        break;
    case -2:
        printf("Bad tag %s -> %s\n", enc->src, enc->dst);
        break;
    default:
        printf("Encode %s -> %s\n", enc->src, enc->dst);
        mp3_info_dump(&info);
        break;
    }
    mp3_info_free(&info);

    if(ret < 0)
        return;

    pipe(pipedesc);
    pid_decoder = fork();
    if(pid_decoder == 0) {
        argv[0] = "mpg123";
        argv[1] = "--stereo";
        argv[2] = "-r";
        argv[3] = "44100";
        argv[4] = "-s";
        argv[5] = enc->src;
        argv[6] = NULL;
        dup2(pipedesc[1], 1);
        close(0);
        close(pipedesc[0]);
        close(2);
        nice(2);
        execv("/usr/bin/mpg123", argv);
        abort();
    }

    pid_encoder = fork();
    if(pid_encoder == 0) {
        close(pipedesc[1]);
        close(1);
        close(2);
        dup2(pipedesc[0], 0);
        argv[0] = "lame";
        argv[1] = "-";
        argv[2] = enc->dst; // Dst
        argv[3] = "-r";
        argv[4] = "-b";
        argv[5] = "192";
        argv[6] = "-t";
        argv[7] = NULL;
        nice(2);
        execv("/usr/bin/lame", argv);
        abort();
    }
    close(pipedesc[0]);
    close(pipedesc[1]);

    int stat_loc;
    waitpid(pid_decoder, &stat_loc, 0);
    printf("decoder %i %s\n", stat_loc, enc->src);

    waitpid(pid_encoder, &stat_loc, 0);
    printf("encoder %i\n", stat_loc);

    free(data);
}

int main(int argc, char *argv[])
{
    int                 nb_thread = 4;
    jobs_queue_t        jq;
    int                 cmd;
    DIR                *dp; 
    struct dirent      *dirp;

    int                 srcdir_len   = strlen(argv[1]);
    int                 dstdir_len   = strlen(argv[2]);


    argc = argc;

    jobs_queue_init(&jq, nb_thread);
    cmd = jobs_queue_func_add(&jq, encode_th);

    dp = opendir(argv[1]);
    if(dp == NULL)
        return 1;

    while ((dirp = readdir(dp)) != NULL) {
        encode_file_t *data;
        int            len = strlen(dirp->d_name);
        char          *pos;

        if((len == 1 && memcmp(dirp->d_name, "." , 1) == 0) ||
           (len == 2 && memcmp(dirp->d_name, "..", 2) == 0))
            continue;

        data = malloc(sizeof(encode_file_t) +
                      len + srcdir_len + 1 + 1 +
                      len + dstdir_len + 1 + 1);

        pos = data->data;

        data->src = pos;
        memcpy(pos, argv[1], srcdir_len);
        pos += srcdir_len;
        *pos = '/';
        pos++;
        memcpy(pos, dirp->d_name, len + 1);
        pos += len + 1;

        data->dst = pos;
        memcpy(pos, argv[2], dstdir_len);
        pos += dstdir_len;
        *pos = '/';
        pos++;
        memcpy(pos, dirp->d_name, len + 1);
        pos += len + 1;

        if(dirp->d_type == DT_UNKNOWN) {
            struct stat buf;

            stat(data->src, &buf);            

            if(!S_ISREG(buf.st_mode)) {
                /* Check if is dir and scan it */
                free(data);
                continue;
            }
        } else {
            if(dirp->d_type != DT_REG) {
                free(data);
                continue;
            }
        }

        jobs_queue_add(&jq, cmd, data);        
    }
    closedir(dp);
    
    jobs_queue_wait(&jq);

    return 0;
}
 
