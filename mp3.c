#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <arpa/inet.h>

#include "vector.h"

#include "ruby.h"

enum charset {
    ISO_8859_1,
    UTF8,
    UTF16_BE,
    UTF16_LE,
    UTF16_BOM,
};

#define malloc xmalloc
#define free xfree

VECTOR_T(int);

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
    int                  fd;
    void                *data;
    char                *title;
    char                *artist;
    char                *album;
    int                  track;
    int                  nb_track;
    int                  years;
    float                duration;
    int                  size;
    vector_int_t         frames;
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
    info->frame.header = htonl(*((uint32_t *)data));

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

    return info->len;
}

static inline int utf8_code_encoding_size(unsigned int code)
{
    switch(code) {
    case 0       ... 0x7F:
        return 1;
    case 0x80    ... 0x7FF:
        return 2;
    case 0x800   ... 0xFFFF:
        return 3;
    case 0x10000 ... 0x1FFFF:
        return 4;
    }
    return 0;
}

static inline uint8_t * utf8_code_convert_code(unsigned int code, uint8_t *pos)
{
    switch(code) {
    case 0x10000 ... 0x1FFFF:
        *pos = 0xF0 + ((code >> 18) & 0x0F);
        pos++;
        *pos = 0x80 + ((code >> 12) & 0x7F);
        pos++;
        *pos = 0x80 + ((code >>  6) & 0x7F);
        pos++;
        *pos = 0x80 + ((code >>  0) & 0x7F);
        pos++;
        break;
    case 0x800   ... 0xFFFF:
        *pos = 0xE0 + ((code >> 12) & 0x1F);
        pos++;
        *pos = 0x80 + ((code >>  6) & 0x7F);
        pos++;
        *pos = 0x80 + ((code >>  0) & 0x7F),
        pos++;
        break;
    case 0x80    ... 0x7FF:
        *pos = 0xC0 | ((code >>  6) & 0x3F);
        pos++;
        *pos = 0x80 | ((code >>  0) & 0x7F);
        pos++;
        break;
    case 0       ... 0x7F:
        *pos = 0x00 | ((code >> 0) & 0x7F);
        pos++;
        break;
    }
    return pos;
}

static inline uint8_t * utf8_convert_iso(const uint8_t *txt, size_t len)
{
    int            dlen;
    uint8_t       *ret;
    const uint8_t *cpos;
    uint8_t       *pos;

    for(dlen = 0, cpos = txt; cpos != txt + len; ++cpos)
        dlen += utf8_code_encoding_size(*cpos);

    ret = malloc(dlen + 1);
    pos = ret;

    for(cpos = txt; cpos != txt + len ; ++cpos)
        pos = utf8_code_convert_code(*cpos, pos);

    *pos = 0;

    return ret;
}

static inline uint8_t * utf8_convert_utf8(const uint8_t *txt, size_t len)
{
    uint8_t *ret;

    ret = malloc(len + 1);
    memcpy(ret, txt, len);
    ret[len] = 0;

    return ret;
}

static inline uint8_t * utf8_convert_utf16_be(const uint8_t *txt, size_t len)
{
    int             dlen;
    uint8_t        *ret;
    const uint16_t *cpos;
    uint8_t        *dpos;
    const uint16_t *epos;

    len &= ~1;
    epos = (const uint16_t *)(txt + len);

    for(dlen = 0, cpos = (const uint16_t *)txt; cpos != epos; ++cpos)
        dlen += utf8_code_encoding_size(be16toh(*cpos));
    
    ret  = malloc(dlen + 1);
    dpos = ret;

    for(cpos = (const uint16_t *)txt; cpos != epos; ++cpos)
        dpos = utf8_code_convert_code(be16toh(*cpos), dpos);

    *dpos = 0;

    return ret;
}

static inline uint8_t * utf8_convert_utf16_le(uint8_t *txt, size_t len)
{
    int             dlen;
    uint8_t        *ret;
    const uint16_t *cpos;
    uint8_t        *dpos;
    const uint16_t *epos;

    len &= ~1;
    epos = (const uint16_t *)(txt + len);

    for(dlen = 0, cpos = (const uint16_t *)txt; cpos != epos; ++cpos)
        dlen += utf8_code_encoding_size(le16toh(*cpos));
    
    ret  = malloc(dlen + 1);
    dpos = ret;

    for(cpos = (const uint16_t *)txt; *cpos; ++cpos)
        dpos = utf8_code_convert_code(le16toh(*cpos), dpos);

    *dpos = 0;

    return ret;
}

static inline uint8_t * convert_to_utf8(uint8_t *txt, size_t len, enum charset from)
{
    if(len == (unsigned)-1)
        len = strlen(txt);

    switch(from) {
    case ISO_8859_1:
        return utf8_convert_iso(txt, len);
    case UTF8:
        return utf8_convert_utf8(txt, len);
    case UTF16_BE:
        return utf8_convert_utf16_be(txt, len);
    case UTF16_LE:
        return utf8_convert_utf16_le(txt, len);
    case UTF16_BOM:
        if(le16toh(*((uint16_t *)txt)) == 0xFEFF)
            return utf8_convert_utf16_le(txt + 2, len - 2);    
        return utf8_convert_utf16_be(txt + 2, len - 2);
    }

    return NULL;
}

typedef struct __attribute__((packed)) id3_v1_t {
    uint8_t tag    [ 3]; // TAG
    uint8_t title  [30];
    uint8_t artist [30];
    uint8_t album  [30];
    uint8_t years  [ 4];
    uint8_t comment[29];
    uint8_t track;
    uint8_t genre;
} id3_v1_t;

static size_t id3_v1_decode(id3_v1_t **info, uint8_t *buf, size_t len)
{
    int          pos    = 0;
    id3_v1_t    *tag;

    if(len != sizeof(id3_v1_t))
        return 0;

    tag = (id3_v1_t*) buf;

    if(tag->tag[0] != 'T' ||
       tag->tag[1] != 'A' ||
       tag->tag[2] != 'G')
        return 0;

    *info = tag;

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
    uint32_t id;
    uint8_t  size[4];
    uint16_t padding           :14;
    uint16_t unsynchronisation : 1;
    uint16_t data_length       : 1;
} id3_v2_frame_t;

static size_t id3_v2_get_size(uint8_t *data)
{
    int i;
    int size = 0;

    for(i = 0; i < 4; ++i) {
        size *= 128;
        size += data[i];
    }
    
    return size;
}

char * id3_v2_get_string(uint8_t *data, size_t len)
{
    switch(data[0]) {
    case 1:
        return convert_to_utf8(data + 1, len - 1, UTF16_BOM);
    case 2:
        return convert_to_utf8(data + 1, len - 1, UTF16_BE);
    case 3:
        return convert_to_utf8(data + 1, len - 1, UTF8);
    default:
        return convert_to_utf8(data + 1, len - 1, ISO_8859_1);
    }

    return NULL;
}

#define ID3_ID(a, b, c, d)                                              \
    (a << 24) | (b << 16) | (c << 8) | (d << 0) 

typedef void (*id3_v2_cb)(uint32_t id, uint8_t *str, size_t size, void *data);

size_t id3_v2_decode(uint8_t *buf, size_t len, id3_v2_cb cb, void *data)
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

        if(frame->data_length) {
            data_len -= sizeof(uint32_t);
            pos      += sizeof(uint32_t);
        }
      /* data = Id3.getUnsynchronisation(data) if(flag & 0x0002 == 0x0002); */

        if(cb)
            cb(htonl(frame->id), buf + pos, data_len, data);

        pos += data_len;
    }

    return len;
}

void mp3_save_tag(uint32_t id, uint8_t *str, size_t size, void *data)
{
    mp3_info_t *info;
    uint8_t    *txt;
    uint8_t    *nb_track;

    info = data;

    switch(id)
    {
    case ID3_ID('T', 'I', 'T', '2'):
        if(info->title == NULL)
            info->title = id3_v2_get_string(str, size);
        break;
    case ID3_ID('T', 'A', 'L', 'B'):
        if(info->album == NULL)
            info->album = id3_v2_get_string(str, size);
        break;
    case ID3_ID('T', 'P', 'E', '1'):
        if(info->artist == NULL)
            info->artist = id3_v2_get_string(str, size);
        break;
    case ID3_ID('T', 'R', 'C', 'K'):
        if(info->track == 0) {
            txt = id3_v2_get_string(str, size);
            info->track = atoi(txt);
            nb_track = strchr(txt, '/');
            if(nb_track)
                info->nb_track = atoi(nb_track + 1);
            free(txt);
        }
        break;
    case ID3_ID('T', 'Y', 'E', 'R'):
        if(info->years == 0) {
            txt = id3_v2_get_string(str, size);
            info->years = atoi(txt);
            free(txt);            
        }
        break;
    default:
        break;
    }
}

int mp3_file_decode(mp3_info_t *info, char *file)
{
    struct stat          stat;
    uint8_t             *buffer;
    size_t               size;
    size_t               i;
    int                  frame_size;
    int                  fd;
    mp3_frame_info_t     finfo;
    id3_v1_t            *info_v1;

    info_v1 = NULL;
    memset(info, 0, sizeof(mp3_info_t));

    fd = open(file, O_RDONLY);
    if(fd == -1)
        return -1;

    fstat(fd, &stat);

    size = stat.st_size;

    buffer = mmap(NULL, size, PROT_READ, MAP_SHARED, fd, 0);
    if(buffer == MAP_FAILED)
        return -1;

    info->size  = size;
    info->fd    = fd;
    info->data  = buffer;

    for(i = 0; i < size;) {
        frame_size = mp3_frame_decode(&finfo, buffer + i, size - i);
        if(frame_size) {
            info->duration += finfo.duration;
            vector_int_push(&info->frames, &frame_size);
        } else {
            frame_size = id3_v2_decode(buffer + i, size - i, mp3_save_tag, info);
            if(frame_size != 0)
                frame_size = id3_v1_decode(&info_v1, buffer + i, size - i);
        }
        if(frame_size == 0)
            frame_size = 1;
        i += frame_size;
    }
    if(info_v1) {
        if(info->title == NULL)
            info->title  = convert_to_utf8(info_v1->title, -1, ISO_8859_1);
        if(info->album == NULL)
            info->album  = convert_to_utf8(info_v1->album, -1, ISO_8859_1);
        if(info->artist == NULL)
            info->artist = convert_to_utf8(info_v1->artist, -1, ISO_8859_1);
        if(info->track == 0)
            info->track  = info_v1->track;
        if(info->years == 0)
            info->years  = atoi(info_v1->years);
    }
    return 0;
}

VALUE cMp3;

static VALUE mp3_init(VALUE self, VALUE arg)
{
    VALUE       array;
    mp3_info_t *info;
    int         i;

    Data_Get_Struct(self, mp3_info_t, info);

    array = rb_ary_new2(info->frames.len);

    for(i = 0; i < info->frames.len; ++i) {
        rb_ary_push(array, INT2FIX(info->frames.data[i]));
    }

    rb_iv_set(self, "@frames", array);

    return self;
}

static VALUE mp3_frames(VALUE self, VALUE arg)
{
    return rb_iv_get(self, "@frames");
}

static VALUE mp3_duration(VALUE self, VALUE arg)
{
    mp3_info_t *info;

    Data_Get_Struct(self, mp3_info_t, info);

    return INT2FIX((int)info->duration);
}

static VALUE mp3_artist(VALUE self, VALUE arg)
{
    mp3_info_t *info;

    Data_Get_Struct(self, mp3_info_t, info);

    if(info->artist == NULL)
        return Qnil;
    return rb_tainted_str_new2(info->artist);
}

static VALUE mp3_album(VALUE self, VALUE arg)
{
    mp3_info_t *info;

    Data_Get_Struct(self, mp3_info_t, info);

    if(info->album == NULL)
        return Qnil;
    return rb_tainted_str_new2(info->album);
}

static VALUE mp3_title(VALUE self, VALUE arg)
{
    mp3_info_t *info;

    Data_Get_Struct(self, mp3_info_t, info);

    if(info->title == NULL)
        return Qnil;
    return rb_tainted_str_new2(info->title);
}

static VALUE mp3_years(VALUE self, VALUE arg)
{
    mp3_info_t *info;

    Data_Get_Struct(self, mp3_info_t, info);

    return INT2FIX((int)info->years);
}

static VALUE mp3_track(VALUE self, VALUE arg)
{
    mp3_info_t *info;

    Data_Get_Struct(self, mp3_info_t, info);

    return INT2FIX((int)info->track);
}

static VALUE mp3_nb_track(VALUE self, VALUE arg)
{
    mp3_info_t *info;

    Data_Get_Struct(self, mp3_info_t, info);

    return INT2FIX((int)info->nb_track);
}

static void mp3_free(mp3_info_t *info)
{
    munmap(info->data, info->size);
    close(info->fd);
    vector_int_clean(&info->frames);
    free(info->title);
    free(info->artist);
    free(info->album);
    free(info);
}

static VALUE mp3_new(VALUE class, VALUE file)
{
  mp3_info_t *info = ALLOC(mp3_info_t);
  mp3_file_decode(info, StringValuePtr(file));
  VALUE tdata = Data_Wrap_Struct(class, 0, mp3_free, info);
  rb_obj_call_init(tdata, 0, NULL);
  return tdata;
}

void Init_mp3() {
  cMp3 = rb_define_class("Mp3File", rb_cObject);
  rb_define_singleton_method(cMp3, "new", mp3_new, 1);
  rb_define_method(cMp3, "initialize", mp3_init, 0);
  rb_define_method(cMp3, "frames", mp3_frames, 0);
  rb_define_method(cMp3, "duration", mp3_duration, 0);
  rb_define_method(cMp3, "title", mp3_title, 0);
  rb_define_method(cMp3, "album", mp3_album, 0);
  rb_define_method(cMp3, "artist", mp3_artist, 0);
  rb_define_method(cMp3, "years", mp3_title, 0);
  rb_define_method(cMp3, "track", mp3_album, 0);
  rb_define_method(cMp3, "nb_track", mp3_artist, 0);
}
