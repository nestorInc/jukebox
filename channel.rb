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

class Channel
  attr_reader :name
  attr_reader :pos
  attr_reader :timestamp

  def initialize(name, library)
    @name         = name;
    @library      = library;
    @connections  = [];
    @history      = [];
    @cur          = nil;
    @pos          = 0;
    @nbPreload    = 1;
    @currentEntry = nil;
    @timestamp    = 0;
    @time         = 0;

    display("Creating new channel #{name}");
    fetchData();
  end

  def meta()
    @currentEntry;
  end

  def cron()
    frames = sync();
    frames.each { |t|
      @connections.each { |s|
        s.write(t.to_s());
      }
    }
  end

  def register(s)
    if(@connections.size() == 0)
      $channelsCron.register(self);
    end
    @connections.push(s);
    display("Registering channel #{@name} [#{@connections.size()} user(s) connected]");
    if(@currentEntry)
      tag = Id3.new();
      tag.title  = @currentEntry[3];
      tag.artist = @currentEntry[4];
      tag.album  = @currentEntry[5];
      s.write(tag.to_s());
    end
  end

  def unregister(s)
    @connections.delete(s);
    if(@connections.size() == 0)
      $channelsCron.unregister(self);
      @time = 0;
    end
    display("Unregistering channel #{@name} [#{@connections.size()} user(s) connected]");
  end

  def next()
    display("Next on channel #{@name}");
    @pos += 1;    
    fetchData();
  end

  def previous()
    display("Previous on channel #{@name}");
    @pos -=1 if(@pos > 0);
    fetchData();
  end

  def mids()
    return @history;
  end

  def getConnected()
    return @connections.size();
  end
 
  def playlist_add(pos, mid)
    @history.insert(@pos+pos+1, mid)
  end

  def playlist_rem(pos)
    @history.delete_at(@pos+pos+1)
  end

  def playlist_move(old_index, new_index)
    mid = @history[@pos+old_index+1]
    if(old_index > new_index) # meaning the song is going up
      playlist_add(new_index, mid)
      playlist_rem(old_index+1)
    else # going down
      playlist_add(new_index+1, mid)
      playlist_rem(old_index)
    end
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
    @cur = Mp3File.new(file);
    tag = Id3.new();
    tag.title  = @currentEntry[3];
    tag.artist = @currentEntry[4];
    tag.album  = @currentEntry[5];
    @tag = tag.to_s();
    @timestamp = Time.now().to_i();
  end

  def sync()
    frames = [];

    now = Time.now();
    if(@time == 0)
      delta = 0.2;
      @time = now - delta;
    end

    if(@tag)
      frames << @tag;
      @tag = nil;
    end

    begin
      delta = now - @time;
      new_frames, delta = @cur.play(delta);
      frames += new_frames;
      @time  += delta;
      self.next() if(@time < now);
    end while(@time < now)

    frames;
  end
end
