#!/usr/bin/env ruby

class Mp3Frame
  attr_reader :version
  attr_reader :layer
  attr_reader :protection
  attr_reader :bitrate
  attr_reader :samplerate
  attr_reader :padding
  attr_reader :hprivate
  attr_reader :channel
  attr_reader :extension
  attr_reader :copyright
  attr_reader :original
  attr_reader :emphasis
  attr_reader :duration

  def to_s()
    @frame;
  end

  def Mp3Frame.fetch(data)
    v = data.unpack("N")[0];

    sync        = (v >> 21) & 0x7FF;
    return nil if(sync != 0x7FF);

    version     = (v >> 19) & 0x003;
    layer       = (v >> 17) & 0x003;
    protection  = (v >> 16) & 0x001;
    bitrate     = (v >> 12) & 0x00F;
    samplerate  = (v >> 10) & 0x003;
    padding     = (v >>  9) & 0x001;
    hprivate    = (v >>  8) & 0x001;
    channel     = (v >>  6) & 0x003;
    extension   = (v >>  4) & 0x003;
    copyright   = (v >>  3) & 0x001;
    original    = (v >>  2) & 0x001; 
    emphasis    = (v >>  0) & 0x003;

    if(version     == MPEG1_VERSION_RESERVED ||
       layer       == MPEG1_LAYER_RESERVED   ||
       samplerate == 3)
      return nil;
    end

    layer = case(layer)
            when MPEG1_LAYER_1 then 1;
            when MPEG1_LAYER_2 then 2;
            when MPEG1_LAYER_3 then 3;
            end

    samplerate = case(samplerate)
                 when 0 then 44100;
                 when 1 then 48000;
                 when 2 then 32000;
                 end

    case(version)
    when MPEG1_VERSION_1
      version    = 1;
      samplerate = samplerate;
    when MPEG1_VERSION_2
      version    = 2;
      samplerate = samplerate >> 1;
    when MPEG1_VERSION_2_5
      version    = 2;
      samplerate = samplerate >> 2;
    end

    bitrate = BITRATE_TABLE[bitrate][(layer-1)+((version-1)*3)];

    return nil if(bitrate == 0);
    if(layer == 1)
      size = (12 * bitrate / samplerate + padding) * 4;
    else
      size = 144 * bitrate / samplerate + padding;
    end

    return nil if(data.bytesize < size);

    frame = data[0..size-1];
    data.replace(data[size..-1]);

    Mp3Frame.new(version,
                 layer,
                 protection,
                 bitrate,
                 samplerate,
                 padding,
                 hprivate,
                 channel,
                 extension,
                 copyright,
                 original,
                 emphasis,
                 frame);
  end

private
  MPEG1_VERSION_1        = 3;
  MPEG1_VERSION_2        = 2;
  MPEG1_VERSION_2_5      = 0;
  MPEG1_VERSION_RESERVED = 1;

  MPEG1_LAYER_1          = 3;
  MPEG1_LAYER_2          = 2;
  MPEG1_LAYER_3          = 1;
  MPEG1_LAYER_RESERVED   = 0;

  BITRATE_TABLE          =
    [[      0,      0,      0,      0,      0,      0 ],
     [  32000,  32000,  32000,  32000,   8000,   8000 ],
     [  64000,  48000,  40000,  48000,  16000,  16000 ],
     [  96000,  56000,  48000,  56000,  24000,  24000 ],
     [ 128000,  64000,  56000,  64000,  32000,  32000 ],
     [ 160000,  80000,  64000,  80000,  40000,  40000 ],
     [ 192000,  96000,  80000,  96000,  48000,  48000 ],
     [ 224000, 112000,  96000, 112000,  56000,  56000 ],
     [ 256000, 128000, 112000, 128000,  64000,  64000 ],
     [ 288000, 160000, 128000, 144000,  80000,  80000 ],
     [ 320000, 192000, 160000, 160000,  96000,  96000 ],
     [ 352000, 224000, 192000, 176000, 112000, 112000 ],
     [ 384000, 256000, 224000, 192000, 128000, 128000 ],
     [ 416000, 320000, 256000, 224000, 144000, 144000 ],
     [ 448000, 384000, 320000, 256000, 160000, 160000 ],
     [      0,      0,      0,      0,      0,      0 ]];

  def initialize(version,
                 layer,
                 protection,
                 bitrate,
                 samplerate,
                 padding,
                 hprivate,
                 channel,
                 extension,
                 copyright,
                 original,
                 emphasis,
                 data)
    @version    = version;
    @layer      = layer;
    @protection = protection;
    @bitrate    = bitrate;
    @samplerate = samplerate;
    @padding    = padding;
    @private    = hprivate;
    @channel    = channel;
    @extension  = extension;
    @copyright  = copyright;
    @original   = original;
    @emphasis   = emphasis;
    @frame      = data;
    @duration   = data.bytesize().to_f * 8 / bitrate;
  end
end

class Mp3File
  attr_reader :time

  def initialize(file)
    @frames         = [];
    @total_duration = 0.0;
    @time           = 0.0;

    data = File.open(file) { |fd|
      fd.read();
    }
    data.force_encoding("BINARY");
    while(data.size >= 4)
      frame = Mp3Frame.fetch(data);
      if(frame)
        @total_duration += frame.duration;
      else
        frame = Id3.fetch(data) if(frame == nil);
      end
      if(frame)
        @frames.push(frame);
      else
        data.replace(data[1, -1]);
      end
    end
  end

  def play(delta)
    cur  = [];
    time = 0.0;

    while(time < delta)
      f     = @frames.shift();
      break if(f == nil);
      time += f.duration;
      cur.push(f);
    end

    @time += time;
    [cur, time];
  end
end

