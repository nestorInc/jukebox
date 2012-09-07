#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <dirent.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>

#include "vector.h"
#include "mp3.h"
#include "thread_pool.h"

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
        argv[2] = enc->dst;
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

typedef struct inode_cache_t {
    ino_t  ino;
    time_t mtime;
} inode_cache_t;

VECTOR_T(inode_cache, inode_cache_t);

int inode_cache_insert(vector_inode_cache_t *cache, ino_t ino, time_t mtime)
{
    inode_cache_t       entry;
    inode_cache_t      *pentry;

    VECTOR_EACH(cache, pentry) {
        if(pentry->ino == ino) {
            if(pentry->mtime == mtime)
                return -1;
            // update
            pentry->mtime = mtime;
            return 0;
        }
    }
    
    entry.ino   = ino;
    entry.mtime = mtime;

    vector_inode_cache_push(cache, &entry);

    return 0;
}

int main(int argc, char *argv[])
{
    int                         nb_thread = 4;
    thread_pool_t              *pool;
    DIR                        *dp; 
    struct dirent              *dirp;

    int                         srcdir_len   = strlen(argv[1]);
    int                         dstdir_len   = strlen(argv[2]);

    // Replace by hash tab
    vector_inode_cache_t        inode_cache;
    time_t                      cur_time;

    int                         scan_time    = 30; // 30s

    argc = argc;

    vector_inode_cache_init(&inode_cache);

    pool = thread_pool_new(nb_thread);

    while(1) {
        cur_time = time(NULL);
        printf("new scan\n");
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

            struct stat buf;

            stat(data->src, &buf);            

            if(!S_ISREG(buf.st_mode) || buf.st_mtime + (scan_time * 2) > cur_time ||
               inode_cache_insert(&inode_cache, buf.st_ino, buf.st_mtime) == -1) {
                /* Check if is dir and scan it */
                free(data);
                continue;
            }

            printf("add %s\n", data->src);

            thread_pool_add(pool, encode_th, data);
        }
        closedir(dp);
        sleep(scan_time);
    }
    
    thread_pool_wait(pool);

    return 0;
}
 
