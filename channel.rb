#!/usr/bin/env ruby

require 'rev'
require 'time'

load 'display.rb'

class ChannelsCron < Rev::TimerWatcher
  def initialize()
    super(0.2, true);
    @channels = [];
  end

  def register(ch)
    @channels.push(ch);
    display("Cron register channel #{ch.name()} [#{@channels.size()}]");
  end

  def unregister(ch)
    @channels.delete(ch);
    display("Cron unregister channel #{ch.name()} [#{@channels.size()}]");
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
  attr_reader :name
  attr_reader :pos
  attr_reader :timestamp

  def initialize(name, library)
    @name    = name;
    @library = library;
    @scks    = [];
    @history = [];
    @pos     = -1;
    @nbPreload = 5;
    @currentEntry = [];
    @timestamp    = 0;
    super();
    display("Creating new channel #{name}");

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
    display("Registering channel #{@name} [#{@scks.size()} user(s) connected]");
  end

  def unregister(s)
    @scks.delete(s);
    if(@scks.size() == 0)
      $channelsCron.unregister(self);
    end
    display("Unregistering channel #{@name} [#{@scks.size()} user(s) connected]");
  end

  def next()
    display("Next on channel #{@name}");
    @pos += 1;    
    flush();
  end

  def previous()
    display("Previous on channel #{@name}");
    @pos -=1 if(@pos > 0);
    flush();
  end

  def mids()
    return @history;
  end

  def getConnected()
    return @scks.size();
  end

  private
  def fetchData() 
     delta = @history.size()-@pos-1;
     if(delta < @nbPreload)
      preload = @nbPreload - delta;
      # here, we calculate the left side of the anti double inclusion range
      # This allows not listening the same music again during the next 30 minutes.
      if(@pos-10 > 0);
        antiDoubleBegin = @pos-10;
      else
        antiDoubleBegin = 0;
      end
      # this allows to have always at least @nbPreload songs in advance from the current position : preloading some files
      for i in 1..preload
        # keep a file from being include twice in the next 15 songs
        lastInsertions = @history[antiDoubleBegin..-1];
        begin
          entry = @library.get_file();
        end while lastInsertions.include?(entry[0]) # the space we look is (10 + preload) wide (30min) see above
        @history.push(entry[0]);
        @currentEntry = entry if(i == 0); # store the current entry to open the good file (see below)
      end
    end
    # move to the next entry
    mid = @history[@pos];
    @currentEntry = @library.get_file(mid);
    file = @currentEntry[2];
    display("Fetching on channel #{@name}: #{file}");
    fd = File.open(file);
    data = fd.read();
    fd.close();
    @timestamp = Time.now().to_i();
    data;    
  end
end
