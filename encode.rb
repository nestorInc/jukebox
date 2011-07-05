#!/usr/bin/env ruby

require 'rev'
require 'thread'

class Encode < Rev::TimerWatcher
  def initialize(originDir, encodedDir)
    @originDir            = originDir;
    @encodedDir           = encodedDir;
    @hEncodingFiles       = {}
    @hWaitEncodingFiles   = {}
    @curEncodingFile      = nil;
    @mutexEncoding        = Mutex.new();
    @condEncoding         = ConditionVariable.new();

    begin 
      File.open("list") { | fd |
        fd.each { |l|
          @hEncodingFiles[l.strip] = true;
        }
      }
    rescue
    end

    @thEncoding = Thread.new() {
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
    }

    super(30, true);
  end

  private
  def on_timer
    scan();
  end

  def scan()
    files = Dir.glob(@originDir + "/*.mp3");

    @mutexEncoding.synchronize {        
      files.each { | f |
        name = f.scan(/.*\/(.*)/);
        name = name[0][0];
        if(@hEncodingFiles[name]     == nil &&
           @hWaitEncodingFiles[name] == nil &&
           name                      != @curEncodingFile)
          @hWaitEncodingFiles[name] = true;
        end
      }
      if(@hWaitEncodingFiles.size() != 0)
        @condEncoding.signal();
      end
    }

  end

  def saveFile()
    File.open("list", "w") { | fd |
      @hEncodingFiles.each { | k, v |
        fd.write(k + "\n");
      }
    }
  end

end

