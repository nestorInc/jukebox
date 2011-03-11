#define _BSD_SOURCE

#include <stdint.h>
#include <errno.h>
#include <string.h>
#include <unistd.h>
#include <stdio.h>
#include <endian.h>

#include "event.h"
#include "sck.h"
#include "mem.h"

typedef struct mpeg1_header_t {
    uint32_t sync       :11;
    uint32_t version    :2;
    uint32_t layer      :2;
    uint32_t protection :1;
    uint32_t bitrate    :4;
    uint32_t sample_rate:2;
    uint32_t padding    :1;
    uint32_t private    :1;
    uint32_t channel    :2;
    uint32_t extension  :2;
    uint32_t copyright  :1;
    uint32_t original   :1;
    uint32_t emphasis   :2;
} __attribute__((packed)) mpeg1_header_t;


typedef enum mpeg1_version_t {
    MPEG1_VERSION_1        = 3,
    MPEG1_VERSION_2        = 2,
    MPEG1_VERSION_2_5      = 0,
    MPEG1_VERSION_RESERVED = 1,
} mpeg1_version_t;

typedef enum mpeg1_layer_t {
    MPEG1_LAYER_1        = 3,
    MPEG1_LAYER_2        = 2,
    MPEG1_LAYER_3        = 1,
    MPEG1_LAYER_RESERVED = 0,
} mpeg1_layer;

static int bitrate_table[16][6] = {
    {      0,      0,      0,      0,      0,      0 },
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
    {      0,      0,      0,      0,      0,      0 }
};

typedef struct encoder_t {
//    event_t          *ev_out;
    int               out;
    event_t          *ev_in;
    event_t          *timer;
    unsigned char     buffer[4096];
    unsigned char    *pos;
    int               trame_available;
    int               frame_size;
} encoder_t;

int encoder_init_stream(encoder_t *enc, int out)
{
    enc = enc;
    out = out;

    return 0;
}

int run_mp3_stream(encoder_t *enc)
{
    int                 ret;
    mpeg1_header_t      header;
    int                 samplerate;
    int                 layer;
    unsigned char*      pos;
    unsigned char*      end;
    unsigned char*      end_buffer;
    int                 version;
    int                 bitrate;
    unsigned int        v;
    struct pollfd      *pfd;

    pfd = event_fd_get_pfd(enc->ev_in);

    end         = enc->pos;
    end_buffer  = enc->buffer + sizeof(enc->buffer);
    while(enc->trame_available)
    {
        if(end_buffer != end) {
            ret = read(pfd->fd, end, end_buffer - end);
            if(ret == 0)
            {
                return 0;
            }
            if(ret == -1)
            {
                if(errno == EINTR) 
                    continue;
                return 1;
            }
            end += ret;
        }
        pos = enc->buffer;
        if(enc->frame_size)
        {
            write(enc->out, enc->buffer, enc->frame_size);
            enc->trame_available--; 
            pos += enc->frame_size;
            enc->frame_size = 0;
        }
        for(; pos != end-3; ++pos) {
            v = htobe32(*((uint32_t*)pos));
            header = *((mpeg1_header_t*) &v);
            header.sync        = v >> 21;
            header.version     = v >> 19;
            header.layer       = v >> 17;
            header.protection  = v >> 16;
            header.bitrate     = v >> 12;
            header.sample_rate = v >> 10;
            header.padding     = v >>  9;
            header.private     = v >>  8;
            header.channel     = v >>  6;
            header.extension   = v >>  4;
            header.copyright   = v >>  3;
            header.original    = v >>  2;
            header.emphasis    = v >>  0;
                
            if(header.sync        != 0x7FF                  ||
               header.version     == MPEG1_VERSION_RESERVED ||
               header.layer       == MPEG1_LAYER_RESERVED   ||
               header.sample_rate == 3)
            {
                continue;
            }

            switch(header.layer)
            {
            case MPEG1_LAYER_1:
                layer = 1;
                break;
            case MPEG1_LAYER_2:
                layer = 2;
                break;
            case MPEG1_LAYER_3:
                layer = 3;
                break;
            }
            switch(header.sample_rate)
            {
            case 0:
                samplerate = 44100;
                break;
            case 1:
                samplerate = 48000;
                break;
            case 2:
                samplerate = 32000;
                break;
            }
            switch(header.version)
            {
            case MPEG1_VERSION_1       :
                version    = 1;
                samplerate = samplerate;
                break;
            case MPEG1_VERSION_2       :
                version    = 2;
                samplerate = samplerate >> 1;
                break;
            case MPEG1_VERSION_2_5     :
                version    = 2;
                samplerate = samplerate >> 2;
                break;
            }

            bitrate = bitrate_table[header.bitrate][(layer-1)+((version-1)*3)];

            if(bitrate == 0)
                continue;

            if(layer == 1) {
                enc->frame_size = (12 * bitrate / samplerate + header.padding) * 4;
            } else {
                enc->frame_size = 144 * bitrate / samplerate + header.padding;
            }
            break;
        }
        memmove(enc->buffer, pos, end-pos);
        end       -= pos-enc->buffer;
        enc->pos   = end;
    }

    pfd->events = 0;

    return 0;
}


void in_mp3_stream_callback(event_t *ev, void *data)
{
    encoder_t     *enc;
    struct pollfd *pfd;
    int            ret;

    enc = data;
    ret = 0;

    if(event_get_kind(ev) == EVENT_KIND_TIMER)
    {
        enc->trame_available += 10;
        if(enc->trame_available > 76)
            enc->trame_available = 76;

        if(enc->ev_in) {
            event_fd_get_pfd(enc->ev_in)->events = POLLIN;
        }
        return;
    }

    pfd = event_fd_get_pfd(ev);
    if(pfd->revents & POLLIN)
    {
        ret = run_mp3_stream(enc);
    }
    if(pfd->revents & POLLERR || pfd->revents & POLLHUP || ret < 0)
    {
        fprintf(stderr, "SHUTDOWN4 %i %m\n", ret);
        xclose(pfd->fd);
        event_unregister(enc->ev_in);
        enc->ev_in = NULL;
    }
}

static void srv_callback(event_t *ev, void *data)
{
    struct sockaddr_in      addr;
    int                     sck;
    encoder_t              *enc;
    struct pollfd          *pfd;

    enc = (encoder_t*)data;

    pfd = event_fd_get_pfd(ev);

    sck = xaccept(pfd->fd, &addr);
    if(sck == -1 || xsetnonblock(sck) == -1)
    {
        return;
    }
    if(enc->ev_in != NULL)
    {
        xclose(sck);
        return;
    }
    fprintf(stderr, "ACCEPT\n");

    enc->ev_in = event_fd_register(sck, POLLIN, &in_mp3_stream_callback, enc);
}

encoder_t * encoder_init(int port, int fd_out)
{
    encoder_t *ret;
    int        srv;

    ret = m_alloc(encoder_t);
    ret->out             = fd_out;
    ret->trame_available = 13;
    ret->pos             = ret->buffer;

    event_init();

    srv = xlisten(port);
//  ret->ev_in = event_fd_register(fd_in,  POLLIN, &in_ogg_encoder_callback, ret);
//  ev_out = event_fd_register(fd_out, 0,       &out_callback, NULL);
    event_fd_register(srv, POLLIN, &srv_callback, ret);
    ret->timer = event_timer_register(260, 1, &in_mp3_stream_callback, ret);

    return ret;
}
