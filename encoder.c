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
#include "db.h"
#include "mstring.h"


typedef struct encode_file_t {
    char   *src;
    char   *dst;
    time_t  mtime;

    char    data[0];
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
    song_t         song;

    ret = mp3_info_decode(&info, enc->src);
    if(info.album  == NULL ||
       info.artist == NULL ||
       info.title  == NULL)
        ret = -2;

    song.src      = enc->src;
    song.dst      = enc->dst;
    song.album    = info.album;
    song.artist   = info.artist;
    song.title    = info.title;
    song.years    = info.years;
    song.track    = info.track;
    song.track_nb = info.nb_track;
    song.genre    = 0;
    song.mtime    = enc->mtime;
    song.bitrate  = 192;
    song.duration = info.duration;
    
    switch(ret) {
    case -1:
        printf("Skip %s -> %s\n", enc->src, enc->dst);
        mp3_info_free(&info);
        break;
    case -2:
        printf("Bad tag %s -> %s\n", enc->src, enc->dst);
        song.status = SONG_STATUS_BAD_TAG;
        db_new_song(&song);
        mp3_info_free(&info);
        break;
    default:
        printf("Encode %s -> %s\n", enc->src, enc->dst);
        mp3_info_dump(&info);
        break;
    }

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
    waitpid(pid_encoder, &stat_loc, 0);


    if(stat_loc == 0)
        song.status = SONG_STATUS_OK;
    else
        song.status = SONG_STATUS_ENCODING_FAIL;

    db_new_song(&song);

    mp3_info_free(&info);
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

void scan(const unsigned char *src, time_t mtime, void *data)
{
    vector_inode_cache_t       *inode_cache = data;

    struct stat buf;
    stat((const char *)src, &buf);

    inode_cache_insert(inode_cache, buf.st_ino, mtime);
}

int main(int argc, char *argv[])
{
    int                         nb_thread = 2;
    thread_pool_t              *pool;
    DIR                        *dp; 
    struct dirent              *dirp;

    string_t                    srcdir;
    string_t                    dstdir;

    // Replace by hash tab
    vector_inode_cache_t        inode_cache;
    time_t                      cur_time;

    int                         scan_time    = 30; // 30s

    argc = argc;

    db_init();

    srcdir = string_init_static(argv[1]);
    dstdir = string_init_static(argv[2]);

    vector_inode_cache_init(&inode_cache);

    db_scan_song(scan, &inode_cache);

    pool = thread_pool_new(nb_thread);

    while(1) {
        cur_time = time(NULL);

        dp = opendir(argv[1]);
        if(dp == NULL)
            return 1;

        while ((dirp = readdir(dp)) != NULL) {
            encode_file_t *data;
            string_t       name;
            string_t       srcfile;
            string_t       dstfile;

            name = string_init_static(dirp->d_name);

            if((name.len == 1 && memcmp(dirp->d_name, "." , 1) == 0) ||
               (name.len == 2 && memcmp(dirp->d_name, "..", 2) == 0))
                continue;

            data = malloc(sizeof(encode_file_t) +
                          name.len + srcdir.len + 1 + 1 +
                          name.len + dstdir.len + 1 + 1);

            srcfile = string_init_full(data->data, 0,
                                       name.len + srcdir.len + 1 + 1, STRING_ALLOC_STATIC);
            dstfile = string_init_full(data->data + srcfile.size, 0,
                                       name.len + srcdir.len + 1 + 1, STRING_ALLOC_STATIC);

            srcfile   = string_concat(srcfile, srcdir);
            srcfile   = string_chr(srcfile, '/');
            srcfile   = string_concat(srcfile, name);
            data->src = srcfile.txt;

            dstfile   = string_concat(dstfile, dstdir);
            dstfile   = string_chr(dstfile, '/');
            dstfile   = string_concat(dstfile, name);
            data->dst = dstfile.txt;

            struct stat buf;

            stat(data->src, &buf);            

            data->mtime = buf.st_mtime;

            if(!S_ISREG(buf.st_mode) || buf.st_mtime + (scan_time * 2) > cur_time ||
               inode_cache_insert(&inode_cache, buf.st_ino, buf.st_mtime) == -1) {
                /* Check if is dir and scan it */
                free(data);
                continue;
            }

            thread_pool_add(pool, encode_th, data);
        }
        closedir(dp);
        sleep(scan_time);
    }
    
    thread_pool_wait(pool);

    return 0;
}
 
