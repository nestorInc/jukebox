#!/usr/bin/env ruby

require 'http.rb'
require 'channel.rb'

class Stream < HttpNode
  module StreamSession
    def on_close()
      ch = @data;
      ch.unregister(self);
      super();
    end

    def switch_channel(ch)
      oldch = @data;
      oldch.unregister(self);
      ch.register(self);
      @data = ch;
    end

    def write(data, low = false)
      if(@icyRemaining == 0 || low)
        super(data);
        return;
      end
      while(data.bytesize() != 0)
        if(@icyRemaining > data.bytesize())
          super(data);
          @icyRemaining -= data.bytesize();
          data     = "";
        else
          super(data[0..@icyRemaining-1]);
          data     = data[@icyRemaining..-1];
          generateIcyMetaData();
          @icyRemaining = @icyInterval;
        end
      end

      super(data)
    end

    def stream_init(icy_meta, ch, proto)
      @icyInterval  = icy_meta == "1" && 4096 || 0;
      @icyRemaining = @icyInterval;
      @data         = ch;
      metaint       = @icyInterval;
      rep = HttpResponse.new(proto, 200, "OK",
                             "Connection"   => "Close",
                             "Content-Type" => "audio/mpeg");
      rep.options["icy-metaint"] = @icyInterval if(@icyInterval != 0);

      write(rep.to_s, true);
      ch.register(self);
    end

    private
    def generateIcyMetaData()
      str  = "";
      ch   = @data;
      meta = ch.meta();

      if(meta && @meta != meta)
        str = "StreamTitle='#{meta.to_s().gsub("\'", " ")}';"
        @meta = meta;
      end
    
      padding = str.bytesize() % 16;
      padding = 16 - padding  if(padding != 0)
      str += "\x00" * padding;
      write((str.bytesize()/16).chr, true);
      write(str, true);
    end
  end

  def initialize(list, library, user)
    @list     = list;
    @library  = library;
    @user     = user;

    super();
  end

  def on_request(s, req)
    action      = req.remaining;
    channelName = s.user;

    @user[s.user] ||= {
      :channel => s.user,
      :stream  => []
    };
    data = @user[s.user];

    ch = @list[data[:channel]];
  
    if(ch == nil)
      ch = Channel.new(channelName, @library);
      @list[channelName] = ch;
    end

    data[:stream].push(s);

    s.extend(StreamSession);
    s.stream_init(req.options["Icy-MetaData"], ch, req.proto);
  end
end
