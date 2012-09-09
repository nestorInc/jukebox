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

int mp3_info_decode(mp3_info_t *info, char *file);

void mp3_info_free(mp3_info_t *info);

void mp3_info_dump(const mp3_info_t *info);

#endif // _MP3_H_
