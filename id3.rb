#!/usr/bin/env ruby

class Id3
   attr_accessor :title
   attr_accessor :artist
   attr_accessor :album
   attr_accessor :date
   attr_accessor :track
   attr_accessor :genre

  def initialize(data = nil)
    @title  = nil;
    @artist = nil;
    @album  = nil;
    @date   = 0;
    @track  = 0;
    @genre  = 0xFF;

    if(data)
      data.force_encoding("BINARY");
      decodeV1(data);
      decodeV2(data);
    end
  end

  def Id3.decode(file)
    fd = File.open(file)
    data = fd.read();
    fd.close();

    Id3.new(data);
  end

  def Id3.fetch(data)
    meta, flag = Id3.fetchV2Frame(data);
    meta;
  end

  def to_s()
    tags = {}
    tags["TIT2"] = setV2String(@title);
    tags["TALB"] = setV2String(@album);
    tags["TPE1"] = setV2String(@artist);
    Id3.setV2(tags);
  end

private
  def decodeV1(data)
    return false if(data.bytesize() < 128);
    meta = data [-128..-1].force_encoding("ISO-8859-1");
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
    return "" if(data.bytesize() == 0);
    enc = data.slice!(0).ord();
    case(enc)
    when 0x01
      bom = data.slice!(0..1);
      if(bom == "\xFF\xFE")
        data.force_encoding("UTF-16LE");
      else  
        data.force_encoding("UTF-16BE");
      end
    when 0x02
      data.force_encoding("UTF-16BE");
    when 0x03
      data.force_encoding("UTF-8");
    else
      data.force_encoding("ISO-8859-1");
    end
    data.encode("UTF-8").strip;
  end

  def setV2String(str)
    str = str.encode("UTF-8");
    data = "\x03";
    data << str;
    data;
  end

  def Id3.getV2Size(data)
    size = 0;
    data[0..3].each_byte { |d|
      size *= 128;
      size += d.ord();
    } 
    size;
  end

  def Id3.setV2Size(size)
    4.times.map { |d|
      v = size % 128;
      size /= 128;
      v
    }.reverse.pack("C4"); 
  end

  def Id3.setV2Header(major, minus, data)
    header = "ID3";
    header << major.chr;
    header << minus.chr;
    header << "\x00";
    header << Id3.setV2Size(data.bytesize());
  end

  def Id3.getUnsynchronisation(data)
    data.force_encoding("BINARY");
    data.gsub("\xFF\x00", "\xFF");
  end

  def Id3.setV2(tags)
    data = tags.map { |t, v|
      v = "" if(v == nil);
      tlv = t;                               # T
      tlv += Id3.setV2Size(v.bytesize());    # L
      tlv << "\x00\x00"                      # Flags
      tlv << v;                              # V
      tlv;
    }.join();

    header = Id3.setV2Header(4, 0, data);
    Id3.new(header + data);
    header + data;
  end

  def Id3.fetchV2Frame(data)
    # search only on the beginning of the file
    return nil if(data.bytesize() < 10);
    return nil if(data[0..2] != "ID3");

    # check version
    version_minor = data[3].ord();
    version_minus = data[4].ord();
    return nil if(version_minor > 4);
    return nil if(version_minor == 4 && version_minus > 0);

    flag = data[5].ord();
    size = Id3.getV2Size(data[6..9]) + 10;
    return nil if(data.bytesize() < size);

    [ data.slice!(0..size-1), flag ];
  end

  def decodeV2(data)
    tag = {};

    meta, flag = Id3.fetchV2Frame(data);
    return false if(meta == nil);

    # remove header
    meta.slice!(0..9);

    # extended header (remove it)
    if ((flag & 0x40) == true)
      size = Id3.getV2Size(meta[0..3]);
      meta.slice!(0..size-1)
    end

    while(meta.bytesize() >= 10)
      id   = meta[0..3];
      size = Id3.getV2Size(meta[4..7]);
      break if(id == "\x00\x00\x00\x00");
      flag = meta[8..9].unpack("n").first;
      meta.slice!(0..9);
      data = meta.slice!(0..size-1);
      data = data[4..-1]                    if(flag & 0x0001 == 0x0001);
      data = Id3.getUnsynchronisation(data) if(flag & 0x0002 == 0x0002);
      tag[id] = data;
    end

    v = tag["TIT2"];
    @title = getV2String(v) if(v);

    v = tag["TALB"];
    @album = getV2String(v) if(v);

    v = tag["TRCK"];
    @track = getV2String(v) if(v);

    v = tag["TPE1"];
    @artist = getV2String(v) if(v);

    return true;
  end
end


