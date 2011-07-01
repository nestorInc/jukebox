#!/usr/bin/env ruby

class Mp3Header
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

  def frame_size
    @frame_size;
  end

  def decode(v)
    @sync        = (v >> 21) & 0x7FF;
    return false if(@sync != 0x7FF);

    @version     = (v >> 19) & 0x003;
    @layer       = (v >> 17) & 0x003;
    @protection  = (v >> 16) & 0x001;
    @bitrate     = (v >> 12) & 0x00F;
    @samplerate  = (v >> 10) & 0x003;
    @padding     = (v >>  9) & 0x001;
    @private     = (v >>  8) & 0x001;
    @channel     = (v >>  6) & 0x003;
    @extension   = (v >>  4) & 0x003;
    @copyright   = (v >>  3) & 0x001;
    @original    = (v >>  2) & 0x001; 
    @emphasis    = (v >>  0) & 0x003;

    if(@version     == MPEG1_VERSION_RESERVED ||
       @layer       == MPEG1_LAYER_RESERVED   ||
       @samplerate == 3)
      return false;
    end

    @layer = case(@layer)
             when MPEG1_LAYER_1 then 1;
             when MPEG1_LAYER_2 then 2;
             when MPEG1_LAYER_3 then 3;
             end

    @samplerate = case(@samplerate)
                  when 0 then 44100;
                  when 1 then 48000;
                  when 2 then 32000;
                  end

    case(@version)
    when MPEG1_VERSION_1
      @version    = 1;
      @samplerate = @samplerate;
    when MPEG1_VERSION_2
      @version    = 2;
      @samplerate = @samplerate >> 1;
    when MPEG1_VERSION_2_5
      @version    = 2;
      @samplerate = @samplerate >> 2;
    end

    @bitrate = BITRATE_TABLE[@bitrate][(@layer-1)+((@version-1)*3)];

    if(@bitrate == 0)
      return false;
    end
    if(@layer == 1)
      @frame_size = (12 * @bitrate / @samplerate + @padding) * 4;
    else
      @frame_size = 144 * @bitrate / @samplerate + @padding;
    end

    return true;
  end

end

class Mp3Trame < Mp3Header
  def initialize(data)
    while(data.size >= 4)
      v = data.unpack("N")[0];
      if(decode(v) == false)
        data.replace(data [4 .. -1]);
        next;
      end

      @trame = data[0 .. frame_size-1];
      data.replace(data[frame_size .. -1]);
      break;
    end
  end
  def to_s()
    @trame;
  end
end

class Mp3Stream
  def initialize()
    @trames    = [];
  end

  def start(t = nil)
    if(t)
      @time = t;
    else
      @time = Time.now();
    end
  end

  def time
    @time;
  end

  def flush
    @trames = [];
  end

  def play()
    cur = [];

    t = Time.now();
    # 26ms by frame
    nb_frame, delta = (t - @time).divmod(0.026);
    @time = t - delta;
    while(nb_frame != 0)
      if(@trames.size < nb_frame)
        cur.concat(@trames);
        nb_frame -= @trames.size;
        data = "";
        data = fetchData();
        data.force_encoding("BINARY");
        while(data.size >= 4)
          trame = Mp3Trame.new(data);
          @trames.push(trame);
        end
      else
        cur.concat(@trames.shift(nb_frame));
        nb_frame = 0;
      end
    end

    cur;
  end
end
