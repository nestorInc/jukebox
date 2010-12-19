#ifndef __ENCODER_H__
#define __ENCODER_H__

struct encoder_t;

typedef struct encoder_t *encoder_hdl_t;

encoder_hdl_t encoder_init(int in, int out);
int encoder_init_stream(encoder_hdl_t enc, int out);

#endif /* __ENCODER_H__ */
