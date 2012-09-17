#!/usr/bin/env ruby

require 'rev'
require 'time'

require 'display.rb'
require 'playlist.rb'
require 'id3.rb'
require 'Mp3Stream'

class ChannelsCron < Rev::TimerWatcher
  def initialize()
    super(0.2, true);
    @channels = [];
  end

  def register(ch)
    @channels.push(ch);
    log("Cron register channel #{ch.name()} [#{@channels.size()}]");
  end

  def unregister(ch)
    @channels.delete(ch);
    log("Cron unregister channel #{ch.name()} [#{@channels.size()}]");
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
  attr_reader   :name
  attr_reader   :timestamp
  attr_reader   :queue

  def initialize(name, library)
    @name         = name;
    @library      = library;
    @connections  = [];
    @queue        = SongQueue.new();
    @cur          = nil;
    @pos          = 0;
    @currentEntry = nil;
    @timestamp    = 0;
    @time         = 0;
    @nb_songs	  = 0;

    log("Creating new channel #{name}");
    set_nb_songs();
    fetchData();
  end

  def meta()
    @currentEntry;
  end

  def cron()
    frames = sync();
    @connections.each { |s|
      s.write(frames);
    }
  end

  def register(s)
    $channelsCron.register(self) if(@connections.size() == 0);
    @connections.push(s);
    log("Registering channel #{@name} [#{@connections.size()} user(s) connected]");
    if(@currentEntry)
      tag = Id3.new();
      tag.title  = @currentEntry.title;
      tag.artist = @currentEntry.artist;
      tag.album  = @currentEntry.album;
      s.write(tag.to_s());
    end
  end

  def unregister(s)
    @connections.delete(s);
    if(@connections.size() == 0)
      $channelsCron.unregister(self);
      @time = 0;
    end
    log("Unregistering channel #{@name} [#{@connections.size()} user(s) connected]");
  end

  def next()
    log("Next on channel #{@name}");
    @queue.next();
    fetchData();
  end

  def previous()
    log("Previous on channel #{@name}");
    @queue.previous();
    fetchData();
  end

  def getCurrentSongInfo()
    rsp           = @currentEntry.to_client();
    rsp[:elapsed] = @cur.time;
    rsp;
  end

  def set_nb_songs()
    @nb_songs = @library.get_nb_songs;
  end

  def to_client()
    rsp                  = @currentEntry.to_client();
    rsp[:elapsed]        = @cur.time;
    rsp[:listener_count] = @connections.size();
    rsp;
  end
 
  private
  def fetchData()
    begin
      nb_preload = 11
      nb_preload = 1 if(@library.get_nb_songs <=  15) # first we check the number of songs in the database leading to left_side (playlist : <s> s s s *c* s s s)
      
      delta     = [ nb_preload - @queue.size, 0 ].max;
      delta.times {
        # keep a file from being include twice in the next x songs
        last_insert = @queue[-nb_preload..-1] || [];
        begin
          entry = @library.get_file().first;
        end while last_insert.include?(entry.mid) # the space we look is (10 + preload) wide (30min) see above
        pos = @queue.add(entry.mid);
      }

      # move to the next entry
      mid = @queue[0];
      @currentEntry = @library.get_file(mid).first;
      file = @currentEntry.dst;
      log("Fetching on channel #{@name}: #{file}");
      @start = @time;
      @cur = Mp3Stream.new(file);
      tag = Id3.new();
      tag.title  = @currentEntry.title;
      tag.artist = @currentEntry.artist;
      tag.album  = @currentEntry.album;
      @tag = tag.to_s();
      @timestamp = Time.now().to_i();
    rescue => e
      @queue.next() if(@queue[0]);
      error("Can't load mid=#{mid}: #{([ e.to_s ] + e.backtrace).join("\n")}", true, $error_file);
      retry;
    end
  end

  def sync()
    frames = "";

    now = Time.now();
    if(@time == 0)
      delta = 0.2;
      @time = now - delta;
      self.next()
    end

    if(@tag)
      frames << @tag;
      @tag = nil;
    end

    begin
      delta = now - @start;
      buffer = @cur.read(delta);
      if(buffer)
        frames << buffer.data;
        @time  += buffer.duration;
      else
        self.next()
      end
    end while(buffer == nil)

    frames;
  end
end
