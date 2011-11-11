#!/usr/bin/env ruby

require 'rev'

class Connection
  attr_reader :socket;
  attr_reader :ch;

  def initialize(s, ch, icy)
    @socket      = s;
    @icyInterval = 0;
    @ch          = ch;
    if(icy == "1")
      @icyInterval = 4096;
    end
    @icyRemaining = @icyInterval;
  end

  def write(data)
    if(@icyRemaining == 0)
      @socket.write(data);
    else
      while(data.bytesize() != 0)
        if(@icyRemaining > data.bytesize())
          @socket.write(data);
          @icyRemaining -= data.bytesize();
          data     = "";
        else
          @socket.write(data[0..@icyRemaining-1]);
          data     = data[@icyRemaining..-1];
          generateIcyMetaData();
          @icyRemaining = @icyInterval;
        end
      end
    end
  end
  def metaint()
    @icyInterval;
  end

  private
  def generateIcyMetaData
    str  = "";
    meta = @ch.meta();

    if(meta && @meta != meta)
      str = "StreamTitle='#{meta.title.gsub("\'", " ")} - #{meta.artist.gsub("\'", " ")} - #{meta.album.gsub("\'", " ")}';"
      @meta = meta;
    end
    
    padding = str.bytesize() % 16;
    padding = 16 - padding  if(padding != 0)
    str += "\x00" * padding;
    @socket.write((str.bytesize()/16).chr);
    @socket.write(str);
  end
end
