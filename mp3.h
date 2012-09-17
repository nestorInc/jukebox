#ifndef _MP3_H_
#define _MP3_H_

typedef struct mp3_info_t {
    char                *title;
    char                *artist;
    char                *album;
    int                  track;
    int                  nb_track;
    int                  years;
    float                duration;
} mp3_info_t;

typedef struct mp3_stream_t {
    int          fd;
    char        *buf;
    size_t       size;

    size_t       data_size;
    size_t       offset;
    float        pos;
} mp3_stream_t;

typedef struct mp3_buffer_t {
    char        *buf;
    size_t       size;
    float        duration;
} mp3_buffer_t;

int mp3_info_decode(mp3_info_t *info, char *file);

void mp3_info_free(mp3_info_t *info);

void mp3_info_dump(const mp3_info_t *info);

mp3_stream_t * mp3_stream_open(char *file);

mp3_stream_t * mp3_stream_init(mp3_stream_t *stream, char *file);

void mp3_stream_close(mp3_stream_t *stream);

int mp3_stream_read(mp3_stream_t *stream, float pos, mp3_buffer_t *buf);

#endif // _MP3_H_
