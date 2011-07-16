#!/usr/bin/env ruby

require 'rev'
require 'thread'

load 'id3.rb'

class EncodingThread < Rev::IO
  def initialize(src, dst, *args, &block)
    @block = block;
    @args  = args;
    extra_lame_param = "--id3v2-only ";

    puts "Encoding #{src} -> #{dst}"

    tag = Id3.decode(src);
    extra_lame_param << "--tt \"#{tag.title}\" "  if(tag.title)
    extra_lame_param << "--ta \"#{tag.artist}\" " if(tag.artist)
    extra_lame_param << "--tl \"#{tag.album}\" "  if(tag.album)
    extra_lame_param << "--tn \"#{tag.track}\" "  if(tag.track != 0)
    extra_lame_param << "--ty \"#{tag.date}\" "   if(tag.date != 0)
      
    @fd = IO.popen("mpg123 --stereo -r 44100 -s \"#{src}\" | lame - \"#{dst}\" -r -t #{extra_lame_param} > /dev/null 2> /dev/null");
    super(@fd);
  end


  private
  def on_read(data)
    puts data;
  end

  def on_close()
    @block.call(*@args);
  end
end

class Encode < Rev::TimerWatcher
  def initialize(originDir, encodedDir)
    @originDir            = originDir;
    @encodedDir           = encodedDir;
    @files                = [];
    @hEncodingFiles       = {}
    @hWaitEncodingFiles   = {}
    @curEncodingFile      = nil;
    loadFile();
    super(30, true);
  end

  def files()
    @files;
  end

  def nextEncode()
    @th = nil;
    if(@curEncodingFile != nil)
      @files.push(@encodedDir + "/" + @curEncodingFile);
      @hEncodingFiles[@curEncodingFile] = true;
      @curEncodingFile = nil;
    end
    if(@hWaitEncodingFiles.size() != 0)
      name, file = @hWaitEncodingFiles.shift();
      @curEncodingFile = name;
      @th = EncodingThread.new(file, @encodedDir + "/" + name, self) { |obj|
        obj.nextEncode();
      }
      @th.attach(@loop) if(@loop != nil);
    end
    saveFile()
  end

  def attach(loop)
    @loop = loop;
    @th.attach(@loop) if(@th != nil);
    super(loop);
  end

  private
  def saveFile()
    File.open("list", "w") { | fd |
      @hEncodingFiles.each { | k, v |
        fd.write(k + "\n");
      }
    }
  end

  def loadFile()
    begin 
      File.open("list") { | fd |
        fd.each { |l|
          @hEncodingFiles[l.strip] = true;
          @files.push(@encodedDir + "/" + l.strip);
        }
      }
    rescue
    end
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
      if(@hEncodingFiles[name]     == nil &&
         @hWaitEncodingFiles[name] == nil &&
         name                      != @curEncodingFile)
         @hWaitEncodingFiles[name] = f;
      end
    }

    if(@hWaitEncodingFiles.size() != 0 && @th == nil)
      nextEncode();
    end
  end

end

