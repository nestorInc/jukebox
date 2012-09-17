#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <arpa/inet.h>
#include <ruby.h>

#include "mp3.h"

VALUE cMp3Stream;

static VALUE mp3_stream_rb_read(VALUE self, VALUE pos)
{
    mp3_stream_t *stream;
    mp3_buffer_t  buffer;
    VALUE         rb_buffer;
    double        cpos;
    VALUE         mp3Buffer;

    Data_Get_Struct(self, mp3_stream_t, stream);

    cpos = NUM2DBL(pos);
    if(mp3_stream_read(stream, cpos, &buffer) == -1)
        return Qnil;

    rb_buffer = rb_tainted_str_new(buffer.buf, buffer.size);
    mp3Buffer = rb_const_get(rb_cObject, rb_intern("Mp3Buffer"));
    return rb_funcall(mp3Buffer, rb_intern("new"), 2,
                      rb_buffer, rb_float_new(buffer.duration));;
}

static VALUE mp3_stream_new(VALUE class, VALUE file)
{
    mp3_stream_t *stream;
    VALUE         tdata;

    stream = ALLOC(mp3_stream_t);
    mp3_stream_init(stream, StringValuePtr(file));
    tdata  = Data_Wrap_Struct(class, 0, mp3_stream_close, stream);
    rb_obj_call_init(tdata, 0, NULL);
    return tdata;
}

void Init_Mp3Stream() {
    rb_require("./mp3_struct.rb");

    cMp3Stream = rb_define_class("Mp3Stream", rb_cObject);
    rb_define_singleton_method(cMp3Stream, "new",  mp3_stream_new, 1);
    rb_define_method(cMp3Stream,           "read", mp3_stream_rb_read, 1);
}
