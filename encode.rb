#!/usr/bin/env ruby

require 'rev'
require 'thread'
require 'date'
require 'mp3.rb'
require 'id3.rb'
require 'worker.rb'

ENCODE_DELAY_SCAN = 30; # seconds
MAX_ENCODE_JOB    = 2;
DEFAULT_BITRATE   = 192;

  def job(song, bitrate, messaging)
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
      messaging.send(:library, :add, song);
      error("Bad tag #{song.src}");
      return
    end

    begin
      src = song.src.gsub(/(["\\$`])/, "\\\\\\1");
      dst = song.dst.gsub(/(["\\$`])/, "\\\\\\1");
      song.bitrate = bitrate;

      rd, wr = IO.pipe
      pid_decoder = fork {
        rd.close()
        STDOUT.reopen(wr)
        wr.close();
        Process.setpriority(Process::PRIO_PROCESS, 0, 2)
        exec("mpg123 --stereo -r 44100 -s \"#{src}\"");
      }
      pid_encoder = fork {
        wr.close();
        STDIN.reopen(rd)
        STDOUT.close()
        rd.close()
        Process.setpriority(Process::PRIO_PROCESS, 0, 2)
        exec("lame - \"#{dst}\" -r -b #{bitrate} -t > /dev/null 2> /dev/null");
      }

      rd.close();
      wr.close()
      debug("Process encoding #{pid_encoder} decoding#{pid_decoder}");

      Process.detach(pid_decoder)

      pid, status = Process.waitpid2(pid_encoder);
      if(status.exitstatus() == 0)
        frames = Mp3File.open(song.dst);
        song.duration = frames.map(&:duration).inject(&:+);
        song.status = Library::FILE_OK;
      else
        song.status = Library::FILE_ENCODING_FAIL;
      end
      messaging.send(:library, :add, song);
    rescue => e
      error("Encode execution error on file #{song.src}: #{([ e.to_s ] + e.backtrace).join("\n")}", true, $error_file);
      song.status = Library::FILE_ENCODING_FAIL;
      messaging.send(:library, :add, song);
      raise e;
    end
  end

class Encode < Rev::TimerWatcher
  def initialize(library, messaging, conf)
    @library              = library;
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

    @messaging    = messaging;

    @messaging.create(:encode, @max_job) do |*args|
      job(*args)
    end

    @messaging.create(:library, 1) do |action, song|
      case(action)
      when :add
        @library.add(song)
      when :update
        @library.update(song)
      end
    end

    super(@delay_scan, true);
  end

  def files()
    @files;
  end


  def attach(loop)
    @loop = loop;
    super(loop);
  end

  private

  def on_timer
    scan();
  end

  def scan()
    files  = Dir.glob(@originDir + "/**/*.mp3");
    files.map { |s| s.force_encoding("BINARY") }
    new_files = files - @cfile;
    @cfile = files;
    now = Time.now;
    new_files.each do | f |
      name = f.scan(/.*\/(.*)/);
      name = name[0][0];
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
      @messaging.send(:encode, song, @bitrate, @messaging)
    end
  end
end

