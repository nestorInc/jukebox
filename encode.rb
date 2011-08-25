#!/usr/bin/env ruby

require 'rev'
require 'thread'
load 'id3.rb'

ENCODE_DELAY_SCAN = 30; # seconds

class EncodingThread < Rev::IO
  def initialize(file, *args, &block)
    @block = block;
    @args  = args;
    extra_lame_param = "--id3v2-only ";
    mid, src, dst, title, artist, album, years, status = file;
    puts "Encoding #{src} -> #{dst}"

    extra_lame_param << "--tt \"#{title.sub('"', '\"')}\" "  if(title)
    extra_lame_param << "--ta \"#{artist.sub('"', '\"')}\" " if(artist)
    extra_lame_param << "--tl \"#{album.sub('"', '\"')}\" "  if(album)
#    extra_lame_param << "--tn \"#{tag.track}\" "  if(tag.track != 0)
    extra_lame_param << "--ty \"#{years}\" "   if(years != 0)
    extra_lame_param.encode!("locale");
    rd, wr = IO.pipe
    @pid = fork {
      rd.close()
      STDOUT.reopen(wr)
      wr.close();
      exec("mpg123 --stereo -r 44100 -s \"#{src.sub('"', '\"')}\" | lame - \"#{dst.sub('"', '\"')}\" -r -b 192 -t #{extra_lame_param}> /dev/null 2> /dev/null");
    }
    wr.close();
    @fd  = rd;
    super(@fd);
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
  def initialize(library, originDir, encodedDir)
    @originDir            = originDir;
    @encodedDir           = encodedDir;
    @library              = library;
    super(ENCODE_DELAY_SCAN, true);
    scan();
  end

  def files()
    @files;
  end

  def nextEncode()
    @th = nil;
    encode();
  end

  def attach(loop)
    @loop = loop;
    @th.attach(@loop) if(@th != nil);
    super(loop);
  end

  private

  def encode()
    return if(@th);

    file = @library.encode_file()
    return if(file == nil);

    mid = file[0];

    @library.change_stat(mid, Library::FILE_ENCODING_PROGRESS);
    @th = EncodingThread.new(file, self, @library, mid) { |status, obj, lib, mid|
      if(status == 0)
        @library.change_stat(mid, Library::FILE_OK)
      else
        @library.change_stat(mid, Library::FILE_ENCODING_FAIL)
      end
      obj.nextEncode();
    }
    @th.attach(@loop) if(@loop != nil);
  end

  def on_timer
    scan();
  end

  def scan()
    files  = Dir.glob(@originDir + "/*.mp3");
    signal = false;

    files.each { | f |
      name = f.scan(/.*\/(.*)/);
      name = name[0][0];
      if(@library.check_file(f))
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
      end
    }

    encode();
  end

end

