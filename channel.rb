#!/usr/bin/env ruby

require 'rev'

class ChannelsCron < Rev::TimerWatcher
  def initialize()
    super(0.2, true);
    @channels = [];
  end

  def register(ch)
    @channels.push(ch);
    puts "Cron register channel #{ch.name()} [#{@channels.size()}]"
  end

  def unregister(ch)
    @channels.delete(ch);
    puts "Cron unregister channel #{ch.name()} [#{@channels.size()}]"
  end

  private 
  def on_timer
    @channels.each { |c|
      c.cron();
    }
  end
end

$channelsCron = ChannelsCron.new();
$channelsCron.attach(Rev::Loop.default)

class Mp3Channel < Mp3Stream
  def initialize(name, library)
    @name    = name;
    @library = library;
    @scks    = [];
    @history = []
    @pos     = 0;
    @nbPreload = 5;
    @currentEntry = [];
    super();
    puts "Create new channel #{name}";
  end

  def name
    @name
  end

  def cron()
    frames = play();
    frames.each { |t|
      @scks.each { |s|
        s.write(t.to_s());
      }
    }
  end

  def register(s)
    if(@scks.size() == 0)
      $channelsCron.register(self);
      start();
    end
    @scks.push(s);
    puts "Register channel #{@name} [#{@scks.size()}]";
  end

  def unregister(s)
    @scks.delete(s);
    if(@scks.size() == 0)
      $channelsCron.unregister(self);
    end
    puts "Unregister channel #{@name} [#{@scks.size()}]";
  end

  def next()
    puts "Next channel #{@name}";    
    flush();
  end

  def previous()
    puts "Previous channel #{@name}";
    @pos -=2 if(@pos > 1);
    flush();
  end

  def getMids()
    return @history;
  end

  def getPos()
    return @pos;
  end

  def getLibrary()
    return @library;
  end

  private
  def fetchData()
    if(@history[@pos] == nil)
      # when we are at the history end, preload some files
      for i in 0..@nbPreload
        # keep a file from being include twice
        begin
          entry = @library.get_file();
        end while @history.include?(entry[0])
        @history.push(entry[0]);
        if(i == 0)
          @currentEntry = entry; # store the current entry to open the good file (see below)
        end
      end
      # end of preloading
    # if we are not at the end, jsut move to the next entry
    else
      mid = @history[@pos];
      @currentEntry = @library.get_file(mid);
    end
    # refresh the position in the playlist
    @pos += 1;
    file = @currentEntry[2];
    puts "Fetch channel #{@name}: #{file}";
    fd = File.open(file);
    data = fd.read();
    fd.close();
    data;    
  end
end
