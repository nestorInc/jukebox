#!/usr/bin/env ruby

require 'rev'
require 'thread'
require 'date'
load 'id3.rb'

ENCODE_DELAY_SCAN = 30; # seconds
MAX_ENCODE_JOB    = 2;
DEFAULT_BITRATE   = 192;

class EncodingThread < Rev::IO
  attr_reader :pid;
  attr_reader :file;
  attr_reader :bitrate;

  def initialize(file, bitrate, *args, &block)
    @block    = block;
    @args     = args;
    @file     = file;
    @bitrate  = bitrate;

    begin 
      mid, src, dst, title, artist, album, years, status = file;
      log("Encoding #{src} -> #{dst}");

      src = src.sub('"', '\"');
      dst = dst.sub('"', '\"');

      rd, wr = IO.pipe
      @pid = fork {
        rd.close()
        STDOUT.reopen(wr)
        wr.close();
        exec("mpg123 --stereo -r 44100 -s \"#{src}\" | lame - \"#{dst}\" -r -b #{bitrate} -t > /dev/null 2> /dev/null");
      }
      debug("Process encoding PID=#{@pid}");
      wr.close();
      @fd  = rd;
      super(@fd);
    rescue => e
      error("Encode execution error on file #{src}: #{e.to_s}", true, $error_file);
      @block.call(255, *@args);
    end
  end


  private
  def on_read(data)
    puts data;
  end

  def on_close()
    pid, status = Process.waitpid2(@pid);
    @block.call(status.exitstatus(), *@args);
  end
end

class Encode < Rev::TimerWatcher
  def initialize(library, conf)
    @library              = library;
    @th                   = [];

    @originDir   = conf["source_dir"]  if(conf && conf["source_dir"]);
    raise "Config: encode::source_dir not found" if(@originDir == nil);
    @originDir.force_encoding(Encoding.locale_charmap)

    @encodedDir  = conf["encoded_dir"] if(conf && conf["encoded_dir"]);
    raise "Config: encode::encoded_dir not found" if(@encodedDir == nil);
    @encodedDir.force_encoding(Encoding.locale_charmap)

    @delay_scan   = conf["delay_scan"] if(conf && conf["delay_scan"]);
    @delay_scan ||= ENCODE_DELAY_SCAN;

    @max_job      = conf["max_job"]    if(conf && conf["max_job"]);
    @max_job    ||= MAX_ENCODE_JOB;

    @bitrate      = conf["bitrate"]    if(conf && conf["bitrate"]);
    @bitrate    ||= DEFAULT_BITRATE;

    super(@delay_scan, true);
  end

  def files()
    @files;
  end

  def nextEncode(th)
    @th.delete(th);
    encode();
  end

  def attach(loop)
    @loop = loop;
    @th.each { |t|
      t.attach(@loop);
    }
    super(loop);
  end

  private

  def encode()
    return if(@th.size >= @max_job);

    file = @library.encode_file()
    return if(file == nil);

    mid = file[0];

    @library.change_stat(mid, Library::FILE_ENCODING_PROGRESS);
    enc = EncodingThread.new(file, @bitrate, self, @library, mid) { |status, obj, lib, mid|
      if(status == 0)
        @library.change_stat(mid, Library::FILE_OK)
      else
        @library.change_stat(mid, Library::FILE_ENCODING_FAIL)
      end
      obj.nextEncode(enc);
    }
    enc.attach(@loop) if(@loop != nil);
    @th.push(enc);

    encode();
  end

  def on_timer
    scan();
  end

  def scan()
    files  = Dir.glob(@originDir + "/*.mp3");
    signal = false;
    nb_new_file = 0;
    now = Time.now;
    files.each { | f |
      name = f.scan(/.*\/(.*)/);
      name = name[0][0];
      if(@library.check_file(f))
        # Check file is not used actualy
        next if(now - File::Stat.new(f).mtime < @delay_scan * 2);
        nb_new_file += 1;
        break if(nb_new_file >= 50);
        tag = Id3.decode(f);
        if(tag.title == nil || tag.artist == nil || tag.album == nil)
          @library.add(f, @encodedDir,
                       tag.title, tag.artist, tag.album, tag.date,
                       Library::FILE_BAD_TAG);
        else
          @library.add(f, @encodedDir + "/" + name,
                       tag.title, tag.artist, tag.album,
                       tag.date, Library::FILE_WAIT);
        end
        encode();
      end
    }
    encode();
  end

end

