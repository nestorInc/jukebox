#!/usr/bin/env ruby

require 'rev'
require 'thread'
require 'date'
require 'mp3'
require 'id3.rb'

ENCODE_DELAY_SCAN = 30; # seconds
MAX_ENCODE_JOB    = 2;
DEFAULT_BITRATE   = 192;

class EncodingThread < Rev::IO
  attr_reader :pid;
  attr_reader :file;
  attr_reader :bitrate;

  def initialize(song, bitrate, *args, &block)
    @block    = block;
    @args     = args;
    @file     = file;
    @bitrate  = bitrate;
    
    log("Encoding #{song.src} -> #{song.dst}");

    tag = Id3.decode(song.src);
    song.album  = tag.album;
    song.artist = tag.artist;
    song.title  = tag.title;
    song.years  = tag.date;
    trackStr = "#{tag.track}";
    if trackStr.include?("/") 
      song.track  = tag.track.split('/')[0];
      song.trackNb  = tag.track.split('/')[1];
    else
      song.track = trackStr;
      song.trackNb = nil;
    end
    song.genre  = tag.genre;

    if(tag.title == nil || tag.artist == nil || tag.album == nil)
      song.status = Library::FILE_BAD_TAG;
      @block.call(song, *@args);
      raise "Bad tag";
    end

    begin
      src = song.src.gsub(/(["\\$`])/, "\\\\\\1");
      dst = song.dst.gsub(/(["\\$`])/, "\\\\\\1");
      song.bitrate = bitrate;

      @song = song;
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
      error("Encode execution error on file #{src}: #{([ e.to_s ] + e.backtrace).join("\n")}", true, $error_file);
      @song.status = Library::FILE_ENCODING_FAIL;
      @block.call(song, *@args);
      raise e;
    end
  end


  private
  def on_read(data)
  end

  def on_close()
    info = Mp3File.new(@song.dst);
    
    @song.frames   = info.frames;
    @song.duration = info.duration;
    pid, status = Process.waitpid2(@pid);
    if(status.exitstatus() == 0)
      @song.status = Library::FILE_OK;
    else
      @song.status = Library::FILE_ENCODING_FAIL;
    end

    @block.call(@song, *@args);
  end
end

class Encode < Rev::TimerWatcher
  def initialize(library, conf)
    @library              = library;
    @th                   = [];
    @cfile                = [];
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

    song = @library.encode_file()
    return if(song == nil);

    mid = song.mid;

    @library.change_stat(mid, Library::FILE_ENCODING_PROGRESS);
    begin
      enc = EncodingThread.new(song, @bitrate, self, @library) { |song, obj, lib|
        lib.update(song);
        obj.nextEncode(enc);
      }
      enc.attach(@loop) if(@loop != nil);
      @th.push(enc);
    rescue
    end

    encode();
  end

  def on_timer
    scan();
  end

  def scan()
    files  = Dir.glob(@originDir + "/**/*.mp3");
    new_files = files - @cfile;
    @cfile = files;
    now = Time.now;
    new_files.each { | f |
      name = f.scan(/.*\/(.*)/);
      name = name[0][0];
      if(@library.check_file(f))
        # Check file is not used actualy
        if(now - File::Stat.new(f).mtime < @delay_scan * 2)
          @cfile.delete(f);
          next;
        end
        song = Song.new({
                          "src"    => f,
                          "dst"    => @encodedDir + "/" + name,
                          "status" => Library::FILE_WAIT
                        })
        @library.add(song);
        encode();
      end
    }
    encode();
  end

end

