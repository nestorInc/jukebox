#!/usr/bin/env ruby

require 'rev'

class Connection
  def initialize(s, ch, icy)
    @sck         = s;
    @icyInterval = 0;
    @ch          = ch;
    if(icy == "1")
      @icyInterval = 4096;
    end
    @icyRemaining = @icyInterval;
  end

  def write(data)
    while(data.bytesize() != 0)
      if(@icyRemaining > data.bytesize())
        @sck.write(data);
        @icyRemaining -= data.bytesize();
        data     = "";
      else
        @sck.write(data[0..@icyRemaining-1]);
        data     = data[@icyRemaining..-1];
        generateIcyMetaData();
        @icyRemaining = @icyInterval;
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
      str = "StreamTitle='#{meta[3].gsub("\'", " ")} - #{meta[4].gsub("\'", " ")} - #{meta[5].gsub("\'", " ")}';"
      @meta = meta;
    end
    
    padding = str.bytesize() % 16;
    padding = 16 - padding  if(padding != 0)
    str += "\x00" * padding;
    @sck.write((str.bytesize()/16).chr);
    @sck.write(str);
  end
end
