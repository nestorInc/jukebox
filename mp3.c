#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <sys/mman.h>

#define CHECK_SIZE(need)                                                \
    if((len-pos) < need) return pos;

typedef union mp3_frame_t {
    struct {
        uint32_t emphasis    : 2;
        uint32_t original    : 1; 
        uint32_t copyright   : 1;
        uint32_t extension   : 2;
        uint32_t channel     : 2;
        uint32_t private     : 1;
        uint32_t padding     : 1;
        uint32_t samplerate  : 2;
        uint32_t bitrate     : 4;
        uint32_t protection  : 1;
        uint32_t layer       : 2;
        uint32_t version     : 2;
        uint32_t sync        :11;
    };
    uint32_t header;
} mp3_frame_t;

typedef struct mp3_frame_info_t {
    mp3_frame_t  frame;
    uint32_t     bitrate;    // Decoded bitrate
    uint32_t     samplerate; // Decoded sample rate
    uint8_t      layer;
    uint8_t      version;
    float        duration;
    uint8_t     *data;
    size_t       len;
} mp3_frame_info_t;

typedef struct mp3_info_t {
    char        *title;
    char        *artist;
    char        *album;
    int          track;
    int          nb_track;
    int          nb_frames;
    float        duration;
} mp3_info_t;

typedef enum mpeg_version_t {
    MPEG_VERSION_1         = 3,
    MPEG_VERSION_2         = 2,
    MPEG_VERSION_2_5       = 0,
    MPEG_VERSION_RESERVED  = 1,
} mpeg_version_t;

typedef enum mpeg_layer_t {
    MPEG_LAYER_1           = 3,
    MPEG_LAYER_2           = 2,
    MPEG_LAYER_3           = 1,
    MPEG_LAYER_RESERVED    = 0,
} mpeg_layer_t;

const int bitrate_table[][6]=
{{      0,      0,      0,      0,      0,      0 },
 {  32000,  32000,  32000,  32000,   8000,   8000 },
 {  64000,  48000,  40000,  48000,  16000,  16000 },
 {  96000,  56000,  48000,  56000,  24000,  24000 },
 { 128000,  64000,  56000,  64000,  32000,  32000 },
 { 160000,  80000,  64000,  80000,  40000,  40000 },
 { 192000,  96000,  80000,  96000,  48000,  48000 },
 { 224000, 112000,  96000, 112000,  56000,  56000 },
 { 256000, 128000, 112000, 128000,  64000,  64000 },
 { 288000, 160000, 128000, 144000,  80000,  80000 },
 { 320000, 192000, 160000, 160000,  96000,  96000 },
 { 352000, 224000, 192000, 176000, 112000, 112000 },
 { 384000, 256000, 224000, 192000, 128000, 128000 },
 { 416000, 320000, 256000, 224000, 144000, 144000 },
 { 448000, 384000, 320000, 256000, 160000, 160000 },
 {      0,      0,      0,      0,      0,      0 }};

size_t mp3_frame_decode(mp3_frame_info_t *info, uint8_t *data, size_t len)
{
    size_t pos = 0;

    CHECK_SIZE(sizeof(mp3_frame_t));
    info->frame.header = *((uint32_t *)data);

    if(info->frame.sync != 0x7FF)
        return 0;

    if(info->frame.version     == MPEG_VERSION_RESERVED ||
       info->frame.layer       == MPEG_LAYER_RESERVED   ||
       info->frame.samplerate  == 3)
        return 0;

    switch(info->frame.layer) {
    case MPEG_LAYER_1: info->layer = 1; break;
    case MPEG_LAYER_2: info->layer = 2; break;
    case MPEG_LAYER_3: info->layer = 3; break;
    }

    switch(info->frame.samplerate) {
    case 0: info->samplerate = 44100; break;
    case 1: info->samplerate = 48000; break;
    case 2: info->samplerate = 32000; break;
    }

    switch(info->frame.version) {
    case MPEG_VERSION_1:
        info->version    = 1;
        info->samplerate = info->samplerate;
        break;
    case MPEG_VERSION_2:
        info->version    = 2;
        info->samplerate = info->samplerate >> 1;
        break;
    case MPEG_VERSION_2_5:
        info->version    = 2;
        info->samplerate = info->samplerate >> 2;
        break;
    }

    info->bitrate = bitrate_table[info->frame.bitrate][info->layer-1+((info->version-1)*3)];
    
    if(info->bitrate == 0)
        return 0;

    if(info->layer == 1)
        info->len = (12 * info->bitrate / info->samplerate + info->frame.padding) * 4;
    else
        info->len = 144 * info->bitrate / info->samplerate + info->frame.padding;

    CHECK_SIZE(sizeof(mp3_frame_t) + info->len);

    info->data = data + sizeof(mp3_frame_t);

    info->duration   = (float)info->len * 8 / info->bitrate;

    return sizeof(mp3_frame_t) + info->len;
}

typedef struct __attribute__((packed)) id3_v1_t {
    uint8_t tag    [ 3]; // TAG
    uint8_t title  [30];
    uint8_t artist [30];
    uint8_t album  [30];
    uint8_t data   [ 4];
    uint8_t comment[29];
    uint8_t track;
    uint8_t genre;
} id3_v1_t;

size_t id3_v1_decode(uint8_t *buf, size_t len)
{
    int          pos    = 0;
    id3_v1_t    *tag;

    CHECK_SIZE(sizeof(id3_v1_t));

    pos = len - sizeof(id3_v1_t);
    tag = (id3_v1_t*) (buf + pos);

    if(memcmp(tag->tag, "TAG", 3) != 0)
        return 0;

    printf("ID3V1 Tag\n");

    return sizeof(id3_v1_t);
}

typedef struct __attribute__((packed)) id3_v2_hdr_t {
    uint8_t tag[3]; // ID3
    uint8_t major;
    uint8_t minor;
    uint8_t padding           :4;
    uint8_t footer            :1;
    uint8_t experimental      :1;
    uint8_t extended_header   :1;
    uint8_t unsynchronisation :1;
    uint8_t size[4];
} id3_v2_hdr_t;

typedef struct __attribute__((packed)) id3_v2_frame_t {
    uint8_t  id[4];
    uint8_t  size[4];
    uint16_t padding           :14;
    uint16_t unsynchronisation : 1;
    uint16_t data_length       : 1;
} id3_v2_frame_t;

size_t id3_v2_get_size(uint8_t *data)
{
    int i;
    int size = 0;

    for(i = 0; i < 4; ++i) {
        size *= 128;
        size += data[i];
//        printf("data[%i] = %i\n", i, data[i]);
    }
    
    return size;
}

size_t id3_v2_decode(uint8_t *buf, size_t len)
{
    size_t               data_len;
    size_t               pos            = 0;
    id3_v2_hdr_t        *hdr;    
    id3_v2_frame_t      *frame;

    hdr = (id3_v2_hdr_t*)buf;
    CHECK_SIZE(sizeof(id3_v2_hdr_t));
    if(memcmp(hdr->tag, "ID3", 3) != 0)
        return 0;

    // Support all version under 2.4.0
    if(hdr->major > 4)
        return 0;  
    if(hdr->major == 4 && hdr->minor > 0)
        return 0;

    pos      += sizeof(id3_v2_hdr_t);
    data_len  = id3_v2_get_size(hdr->size);
    CHECK_SIZE(data_len);
    len       = data_len;

    if(hdr->extended_header) { // Skip extended header
        CHECK_SIZE(sizeof(uint32_t));
        data_len = id3_v2_get_size(&buf[pos]);
        CHECK_SIZE(data_len);
        pos += data_len;
    }

    while((len - pos) >= sizeof(id3_v2_frame_t)) {
        frame    = (id3_v2_frame_t*)(buf + pos);
        pos     += sizeof(id3_v2_frame_t);
        data_len = id3_v2_get_size(frame->size);
        if(data_len == 0)
            return pos;
        CHECK_SIZE(data_len);

        printf("ID3V2 Tag %4s\n", frame->id);

      /* data = data[4..-1]                    if(flag & 0x0001 == 0x0001); */
      /* data = Id3.getUnsynchronisation(data) if(flag & 0x0002 == 0x0002); */
        pos += data_len;
    }

    return len;
}



int mp3_decode(mp3_info_t *info, char *file)
{
    struct stat          stat;
    uint8_t             *buffer;
    size_t               size;
    size_t               i;
    size_t               frame_size;
    int                  fd;
    mp3_frame_info_t     finfo;

    memset(info, 0, sizeof(mp3_info_t));

    fd = open(file, O_RDONLY);
    if(fd == -1)
        return -1;

    fstat(fd, &stat);

    size = stat.st_size;

    buffer = mmap(NULL, size, PROT_READ, MAP_SHARED, fd, 0);
    if(buffer == MAP_FAILED)
        return -1;

    frame_size  = id3_v1_decode(buffer, size);
    size       -= frame_size;

    for(i = 0; i < size; ++i) {
        frame_size = mp3_frame_decode(&finfo, buffer + i, size - i);
        if(frame_size) {
            info->nb_frames++;
            info->duration += finfo.duration;
        } else {
            frame_size = id3_v2_decode(buffer + i, size - i);
        }
        i += frame_size;
    }
    printf("nb frame %i duration %f\n", info->nb_frames, info->duration);

    return 0;
}


int main(int argc, char *argv[])
{
    int                 i;
    mp3_info_t          info;

    for(i = 1; i < argc; ++i) {
        mp3_decode(&info, argv[i]);
    }
    
    return 0;
}
