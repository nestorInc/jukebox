#!/usr/bin/env ruby

class Id3
   attr_reader :title
   attr_reader :artist
   attr_reader :album
   attr_reader :date
   attr_reader :track
   attr_reader :genre

  def initialize(data)
    @title  = "(no title)";
    @artist = "(no artist)";
    @album  = "(no album)";
    @date   = 0;
    @track  = 0;
    @genre  = 0xFF;

    data.force_encoding("BINARY");
    decodeV1(data);
    decodeV2(data);
  end

  def Id3.decode(file)
    fd = File.open(file)
    data = fd.read();
    fd.close();

    Id3.new(data);
  end

  def Id3.fetch(data)
    meta = Id3.decodeV2Header(data);
    data.slice!(0..meta.bytesize()-1);
    meta;
  end

private
  def decodeV1(data)
    return false if(data.bytesize() < 128);
    meta = data [-128..-1];
    return false if(meta.slice!(0..2) != "TAG");

    @title  = meta.slice!(0..29).strip().encode("UTF-8");
    @artist = meta.slice!(0..29).strip().encode("UTF-8");
    @album  = meta.slice!(0..29).strip().encode("UTF-8");
    @date   = meta.slice!(0..3).strip().to_i();
    meta.slice!(0..28); # comment
    @track  = meta.slice!(0).ord();
    @genre  = meta.slice!(0).ord();
    return true;
  end

  def getV2String(data)
    enc = data.slice!(0).ord();
    case(enc)
    when 0x01
      data.force_encoding("UTF-16LE");
    when 0x02
      data.force_encoding("UTF-16BE");
    when 0x03
      data.force_encoding("UTF8");
    else
      data.force_encoding("ISO-8859-1");
    end
    data.encode("UTF-8");
  end

  def Id3.getV2Size(data)
    size = 0;
    data[0..3].each_byte { |d|
      size *= 128;
      size += d.ord();
    } 
    size;
  end

  def Id3.decodeV2Header(data)
    # search only on the beginning of the file
    return nil if(data.bytesize() < 10);
    return nil if (data[0..2] != "ID3");

    # check version
    version_minor = data[3].ord();
    version_minus = data[4].ord();
    return nil if(version_minor > 4);
    return nil if(version_minor == 4 && version_minus > 0);

    flag = data[5].ord();
    size = Id3.getV2Size(data[6..9]);
    return nil if(data.bytesize() < size);
    data[0..size-1];
  end

  def decodeV2(data)
    tag = {};

    meta = Id3.decodeV2Header(data);
    return false if(meta == nil);

    # remove header
    meta.slice!(0..9);

    # extended header (remove it)
    if ((flag & 0x40) == true)
      puts "extended header";
      size = Id3.getV2Size(meta[0..3]);
      meta.slice!(0..size-1)
    end

    # remove footer
    if ((flag & 0x10) == true)
      meta.slice!(-10..-1);
    end

    while(meta.bytesize() >= 10)
      id   = meta[0..3];
      size = Id3.getV2Size(meta[4..7]);
      break if(id == "\x00\x00\x00\x00");
      flag = meta[8..9];
      meta.slice!(0..9);
      data = meta.slice!(0..size-1);
      tag[id] = data;
    end

    v = tag["TIT2"];
    if(v)
      @title = getV2String(v);
    end

    v = tag["TALB"];
    if(v)
      @album = getV2String(v);
    end

    v = tag["TRCK"];
    if(v)
      @track = getV2String(v);
    end

    v = tag["TPE1"];
    if(v)
      @artist = getV2String(v);
    end

    return true;
  end
end


