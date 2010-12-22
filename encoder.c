#define _BSD_SOURCE 1

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <vorbis/vorbisenc.h>
#include <stdint.h>
#include <unistd.h>

#include "event.h"
#include "encoder.h"
#include "mem.h"

#define READ 1024

#define BITRATE 44100
#define NB_CHANNEL 2

typedef struct encoder_t {
    ogg_stream_state  os; /* take physical pages, weld into a logical
                        stream of packets */
    vorbis_info       vi; /* struct that stores all the static vorbis bitstream
                        settings */
    vorbis_comment    vc; /* struct that stores all the user comments */

    vorbis_dsp_state  vd; /* central working state for the packet->PCM decoder */
    vorbis_block      vb; /* local working space for packet->PCM decode */

//    event_t          *ev_out;
    int               out;
    event_t          *ev_in;
    event_t          *timer;

    int               bytes_available;

    char*             header;
    int               header_len;
} encoder_t;

void init_ogg_encode(encoder_t *enc)
{
    int ret;

    vorbis_info_init(&enc->vi);

    ret = vorbis_encode_init(&enc->vi, NB_CHANNEL, BITRATE, -1, 128000, -1);
    if(ret != 0)
        return ;
    vorbis_comment_init(&enc->vc);
    vorbis_comment_add_tag(&enc->vc, "ENCODER", "encoder_example.c");

    vorbis_analysis_init(&enc->vd, &enc->vi);
    vorbis_block_init(&enc->vd, &enc->vb);

    ogg_stream_init(&enc->os, 0);

}

int init_stream_ogg_encode(encoder_t *enc)
{
    ogg_packet header;
    ogg_packet header_comm;
    ogg_packet header_code;

    ogg_page   og; /* one Ogg bitstream page.  Vorbis packets are inside */
    int        pos;

    vorbis_analysis_headerout(&enc->vd, &enc->vc, 
                              &header, &header_comm,&header_code);
    ogg_stream_packetin(&enc->os, &header); /* automatically placed in its own
                                         page */
    ogg_stream_packetin(&enc->os, &header_comm);
    ogg_stream_packetin(&enc->os, &header_code);

    /* This ensures the actual
     * audio data will start on a new page, as per spec
     */
    int result = ogg_stream_flush(&enc->os, &og);
    if(result == 0)
        return -1;

    pos              = 0;
    enc->header_len  = og.header_len + og.body_len;
    enc->header      = ma_alloc(char, enc->header_len);
    memcpy(enc->header + pos, og.header, og.header_len); 
    pos             += og.header_len;
    memcpy(enc->header + pos, og.body, og.body_len);
    pos             += og.body_len;

    if(ogg_stream_flush(&enc->os, &og)) {
        enc->header_len += og.header_len + og.body_len;
        enc->header      = ma_realloc(enc->header, char, enc->header_len);
        memcpy(enc->header + pos, og.header, og.header_len); 
        pos             += og.header_len;
        memcpy(enc->header + pos, og.body, og.body_len);
        pos             += og.body_len;
    }

    printf("flush init stream %i\n", result);

    return 0;
}

int encoder_init_stream(encoder_t *enc, int out)
{
    fprintf(stderr, "\n\ninit_stream %p %i\n\n", enc->header, enc->header_len);
    return write(out, enc->header, enc->header_len);
}

int read_in(encoder_t *enc, char *buffer, const int size)
{
    int               read_size;
    struct pollfd    *pfd;

    pfd = event_fd_get_pfd(enc->ev_in);
    if(size > enc->bytes_available) {
        pfd->events = 0;
        return 0;
    }

    read_size = read(pfd->fd, buffer, size);

    if(read_size <= 0)
        return read_size;
    
    enc->bytes_available -= read_size;

    return read_size;
}

int run_ogg_encode(encoder_t *enc)
{
    long             i;
    long             bytes;
    ogg_packet       op; /* one raw packet of data for decode */
    ogg_page         og; /* one Ogg bitstream page.  Vorbis packets are inside */

    int8_t           readbuffer[READ*4+44]; /* out of the data segment, not the stack */

    bytes = read_in(enc, (char *)readbuffer,
                    READ*sizeof(uint16_t)*NB_CHANNEL); /* stereo hardwired here */

    if(bytes == 0)
        return bytes;

    if(bytes < 0) {
        /* end of file.  this can be done implicitly in the mainline,
           but it's easier to see here in non-clever fashion.
           Tell the library we're at end of stream so that it can handle
           the last frame and mark end of stream in the output properly */
        vorbis_analysis_wrote(&enc->vd, 0);
    } else {
        /* data to encode */

        /* expose the buffer to submit data */
        float **buffer = vorbis_analysis_buffer(&enc->vd, READ);

        /* uninterleave samples */
        for(i = 0; i < bytes/4; i++) {
            buffer[0][i]=((readbuffer[i*4+1]<<8)|
                          (0x00ff&(int)readbuffer[i*4+0]))/32768.f;
            buffer[1][i]=((readbuffer[i*4+3]<<8)|
                          (0x00ff&(int)readbuffer[i*4+2]))/32768.f;
        }

        /* tell the library how much we actually submitted */
        vorbis_analysis_wrote(&enc->vd, i);
    }

    /* vorbis does some data preanalysis, then divvies up blocks for
       more involved (potentially parallel) processing.  Get a single
       block for encoding now */
    while(vorbis_analysis_blockout(&enc->vd, &enc->vb) == 1) {

        /* analysis, assume we want to use bitrate management */
        vorbis_analysis(&enc->vb, NULL);
        vorbis_bitrate_addblock(&enc->vb);

        while(vorbis_bitrate_flushpacket(&enc->vd, &op)) {
            /* weld the packet into the bitstream */
            ogg_stream_packetin(&enc->os, &op);

            /* write out pages (if any) */
            int result = ogg_stream_pageout(&enc->os, &og);
            if(result == 0)
                break;

            write(enc->out, og.header, og.header_len);
            write(enc->out, og.body,   og.body_len);

            if(ogg_page_eos(&og))
                return -1;
            /* this could be set above, but for illustrative purposes, I do
               it here (to show that vorbis does know where the stream ends) */

        }
    }

    return 0;
}

void clean_ogg_encode(encoder_t *enc)
{
    ogg_stream_clear    (&enc->os);
    vorbis_block_clear  (&enc->vb);
    vorbis_dsp_clear    (&enc->vd);
    vorbis_comment_clear(&enc->vc);
    vorbis_info_clear   (&enc->vi);
}



void in_ogg_encoder_callback(event_t *ev, void *data)
{
    encoder_t     *enc;
    struct pollfd *pfd;

    enc = data;

    if(event_get_kind(ev) == EVENT_KIND_TIMER)
    {
        enc->bytes_available += BITRATE * NB_CHANNEL * sizeof(uint16_t) / 5;

        event_fd_get_pfd(enc->ev_in)->events = POLLIN;
        return;
    }

    pfd = event_fd_get_pfd(ev);
    if(pfd->revents & POLLIN)
    {
        if(run_ogg_encode(enc) != 0) {
            event_exit();
        }
    }
    if(pfd->revents & POLLERR || pfd->revents & POLLHUP)
    {
        abort();
    }
}

encoder_t * encoder_init(int fd_in, int fd_out)
{
    encoder_t *ret;

    ret = m_alloc(encoder_t);
    ret->out             = fd_out;
    ret->bytes_available = 44100*2*2*5;
    init_ogg_encode(ret);
    init_stream_ogg_encode(ret);

    event_init();

    ret->ev_in = event_fd_register(fd_in,  POLLIN, &in_ogg_encoder_callback, ret);
//  ev_out = event_fd_register(fd_out, 0,       &out_callback, NULL);
    ret->timer = event_timer_register(200, 1, &in_ogg_encoder_callback, ret);

    return ret;
}
