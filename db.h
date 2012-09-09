#ifndef __DB_H__
#define __DB_H__

typedef enum song_status_t {
    SONG_STATUS_BAD_TAG       = 2,
    SONG_STATUS_ENCODING_FAIL = 4,
    SONG_STATUS_OK            = 5,
} song_status_t;

typedef struct song_t {
    int                 mid;
    char               *src;
    char               *dst;
    char               *title;
    char               *artist;
    char               *album;
    unsigned int        years;
    unsigned int        track;
    unsigned int        track_nb;
    unsigned int        genre;
    song_status_t       status;
    time_t              mtime;
    int                 bitrate;
    int                 duration;
} song_t;

int db_init(void);

void db_new_song(song_t *song);

typedef void (*scan_fn)(const unsigned char *src, time_t mtime, void *data);

void db_scan_song(scan_fn fn, void *data);

#endif /* __DB_H__ */
