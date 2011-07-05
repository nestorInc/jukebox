#!/usr/bin/env ruby

require 'rev'
require 'thread'

class EncodingThread < Rev::AsyncWatcher
  def initialize
    @hEncodingFiles       = {}
    @hWaitEncodingFiles   = {}
    @curEncodingFile      = nil;
    @mutexEncoding        = Mutex.new();

    begin 
      File.open("list") { | fd |
        fd.each { |l|
          @hEncodingFiles[l.strip] = true;
        }
      }
    rescue
    end
  end

  def update(&block)
    @mutexEncoding.synchronize {
      block.call(@hEncodingFiles,
                 @hWaitEncodingFiles,
                 @curEncodingFile);
    }
  end

  private
  def on_signal()
      name = "";
      @mutexEncoding.synchronize {
        if(@hWaitEncodingFiles.size() == 0)
          @condEncoding.wait();
        end
        f, v = @hWaitEncodingFiles.shift();
        name = f.scan(/.*\/(.*)/);
        name = name[0][0];
        @curEncodingFile = f;
      }
      
      puts "Encoding #{@curEncodingFile}"
      val = system("mpg123 --stereo -r 44100 -s \"#{@curEncodingFile}\" | lame - \"#{@encodedDir + "/" + name}\" -r > /dev/null 2> /dev/null" );
      if(val == true)
        puts "Successfull Encoding #{@curEncodingFile} "
      else
        puts "Fail Encoding #{@curEncodingFile} "
      end
    
      @mutexEncoding.synchronize {        
        @hEncodingFiles[@curEncodingFile] = true;
        @curEncodingFile = nil;
      }
      saveFile();
  end

  def saveFile()
    File.open("list", "w") { | fd |
      @hEncodingFiles.each { | k, v |
        fd.write(k + "\n");
      }
    }
  end
end

class Encode < Rev::TimerWatcher
  def initialize(originDir, encodedDir)
    @originDir            = originDir;
    @encodedDir           = encodedDir;
    @th                   = EncodingThread.new();
    super(30, true);
  end

  private
  def on_timer
    scan();
  end

  def scan()
    files  = Dir.glob(@originDir + "/*.mp3");
    signal = false;
    @th.update { |hEncodingFiles, hWaitEncodingFiles, curEncodingFile  |
      files.each { | f |
        name = f.scan(/.*\/(.*)/);
        name = name[0][0];
        if(hEncodingFiles[name]     == nil &&
           hWaitEncodingFiles[name] == nil &&
           name                      != curEncodingFile)
          hWaitEncodingFiles[name] = true;
        end
      }
      if(hWaitEncodingFiles.size() != 0)
        signal = true;
      end
    }
    @th.signal() if(signal == true);
  end

  def saveFile()
    File.open("list", "w") { | fd |
      @hEncodingFiles.each { | k, v |
        fd.write(k + "\n");
      }
    }
  end

end

