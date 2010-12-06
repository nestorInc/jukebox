#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <vorbis/vorbisenc.h>
#include <stdint.h>
#include <unistd.h>

#define READ 1024

#define BITRATE 44100
#define NB_CHANNEL 2

ogg_stream_state os; /* take physical pages, weld into a logical
                        stream of packets */
vorbis_info      vi; /* struct that stores all the static vorbis bitstream
                        settings */
vorbis_comment   vc; /* struct that stores all the user comments */

vorbis_dsp_state vd; /* central working state for the packet->PCM decoder */
vorbis_block     vb; /* local working space for packet->PCM decode */

void init_ogg_encode(void)
{
    int ret;

    vorbis_info_init(&vi);

    ret = vorbis_encode_init(&vi, NB_CHANNEL, BITRATE, -1, 128000, -1);
    if(ret != 0)
        return ;
    vorbis_comment_init(&vc);
    vorbis_comment_add_tag(&vc,"ENCODER","encoder_example.c");

    vorbis_analysis_init(&vd,&vi);
    vorbis_block_init(&vd,&vb);

    ogg_stream_init(&os, 0);

}

int init_stream_ogg_encode(int out)
{
    ogg_packet header;
    ogg_packet header_comm;
    ogg_packet header_code;

    ogg_page         og; /* one Ogg bitstream page.  Vorbis packets are inside */

    vorbis_analysis_headerout(&vd,&vc,&header,&header_comm,&header_code);
    ogg_stream_packetin(&os,&header); /* automatically placed in its own
                                         page */
    ogg_stream_packetin(&os,&header_comm);
    ogg_stream_packetin(&os,&header_code);

    /* This ensures the actual
     * audio data will start on a new page, as per spec
     */
    int result = ogg_stream_flush(&os,&og);
    if(result == 0)
        return -1;
    write(out, og.header,og.header_len);
    write(out, og.body,og.body_len);
    return 0;
}

int read_in(int fd, char *buffer, const int size) {

    static int    bytes_available;
    static time_t last_time        = 0;

    time_t        cur_time;
    int           read_size;

    deb:
    cur_time = time(0);
    if(last_time < cur_time) {
        if(last_time == 0) {
            // Pre fetch 10s
            last_time = cur_time - 10;
        }
        bytes_available += (cur_time - last_time)
            * BITRATE * NB_CHANNEL * sizeof(uint16_t);

        fprintf(stderr, "\nupdate cnt %i\n", bytes_available);
        last_time = cur_time;
    }

    if(size > bytes_available) {
        usleep(1000000);
        goto deb;
        fprintf(stderr, "\nwait\n");
    }
    read_size = read(fd, buffer, size);

    if(read_size <= 0) 
        return 0;
    
    bytes_available -= read_size;

    fprintf(stderr, "\ravailable %i         ", bytes_available);

    return read_size;
}

int run_ogg_encode(int in, int out)
{
    long i;
    long bytes;
    ogg_packet       op; /* one raw packet of data for decode */
    ogg_page         og; /* one Ogg bitstream page.  Vorbis packets are inside */

    int8_t readbuffer[READ*4+44]; /* out of the data segment, not the stack */

    bytes = read_in(in, (char *)readbuffer,
                    READ*sizeof(uint16_t)*NB_CHANNEL); /* stereo hardwired here */

    if(bytes == 0) {
        /* end of file.  this can be done implicitly in the mainline,
           but it's easier to see here in non-clever fashion.
           Tell the library we're at end of stream so that it can handle
           the last frame and mark end of stream in the output properly */
        vorbis_analysis_wrote(&vd, 0);
    } else {
        /* data to encode */

        /* expose the buffer to submit data */
        float **buffer = vorbis_analysis_buffer(&vd, READ);

        /* uninterleave samples */
        for(i = 0; i < bytes/4; i++) {
            buffer[0][i]=((readbuffer[i*4+1]<<8)|
                          (0x00ff&(int)readbuffer[i*4+0]))/32768.f;
            buffer[1][i]=((readbuffer[i*4+3]<<8)|
                          (0x00ff&(int)readbuffer[i*4+2]))/32768.f;
        }

        /* tell the library how much we actually submitted */
        vorbis_analysis_wrote(&vd, i);
    }

    /* vorbis does some data preanalysis, then divvies up blocks for
       more involved (potentially parallel) processing.  Get a single
       block for encoding now */
    while(vorbis_analysis_blockout(&vd, &vb) == 1) {

        /* analysis, assume we want to use bitrate management */
        vorbis_analysis(&vb,NULL);
        vorbis_bitrate_addblock(&vb);

        while(vorbis_bitrate_flushpacket(&vd, &op)) {

            /* weld the packet into the bitstream */
            ogg_stream_packetin(&os, &op);

            /* write out pages (if any) */
            int result = ogg_stream_pageout(&os, &og);
            if(result == 0)
                break;
            write(out, og.header, og.header_len);
            write(out, og.body,   og.body_len);

            /* this could be set above, but for illustrative purposes, I do
               it here (to show that vorbis does know where the stream ends) */

            if(ogg_page_eos(&og))
                return -1;
        }
    }
    if(bytes <= 0) {
        fprintf(stderr, "end\n");
    }

    return 0;
}

void clean_ogg_encode(void)
{
    ogg_stream_clear(&os);
    vorbis_block_clear(&vb);
    vorbis_dsp_clear(&vd);
    vorbis_comment_clear(&vc);
    vorbis_info_clear(&vi);
}

int main(int argc, char *argv[])
{
  int fd_in  = 0;
  int fd_out = 1;

  argc = argc;
  argv = argv;

  init_ogg_encode();
  init_stream_ogg_encode(fd_out);
  while(run_ogg_encode(fd_in, fd_out) == 0);
  clean_ogg_encode();

  fprintf(stderr,"Done.\n");
  return(0);
}
