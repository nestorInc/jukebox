#!/usr/bin/env ruby

require 'rev'
require 'time'

require 'display.rb'
require 'playlist.rb'

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

  def initialize(name, library)
    @name         = name;
    @library      = library;
    @connections  = [];
    @history      = Playlist.new();
    @cur          = nil;
    @pos          = 0;
    @currentEntry = nil;
    @timestamp    = 0;
    @time         = 0;
    @nb_songs	  = 0;
    @remaining    = 0;

    log("Creating new channel #{name}");
    set_plugin()
    set_nb_songs();
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
    @pos += 1;    
    fetchData();
  end

  def previous()
    log("Previous on channel #{@name}");
    @pos -=1 if(@pos > 0);
    fetchData();
  end

  def mids()
    @history[@pos..-1];
  end

  def getConnected()
    @connections.size();
  end
 
  def add_song(pos, mid)
    @timestamp = Time.now().to_i();
    @history.add(@pos + pos + 1, mid)
  end

  def del_song(pos)
    @timestamp = Time.now().to_i();
    @history.del(@pos + pos + 1);
  end

  def move_song(old_index, new_index)
    @timestamp = Time.now().to_i();
    @history.move(@pos + old_index + 1, @pos + new_index + 1);
  end

  def set_plugin(name = "default")
    begin
      load "plugins/#{name}.rb"
      extend Plugin
      log("Loading default plugin for songs selection")
      true;
    rescue => e
      error("Error to load plugin #{name}", true, $error_file);
      false;
    end
  end
 
  def set_nb_songs()
    @nb_songs = @library.get_nb_songs;
  end
 
  private
  def fetchData()
    begin
      # move to the next entry
      mid = @history[@pos];
      @currentEntry = @library.get_file(mid).first;
      file = @currentEntry.dst;
      log("Fetching on channel #{@name}: #{file}");
      File.open(file) { |fd|
        @cur = @currentEntry.frames.map { |b|
          fd.read(b);
        }
      }
      @frame = 0;
      tag = Id3.new();
      tag.title  = @currentEntry.title;
      tag.artist = @currentEntry.artist;
      tag.album  = @currentEntry.album;
      @tag = tag.to_s();
      @timestamp = Time.now().to_i();
    rescue => e
      @pos += 1 if(@history[@pos]);
      error("Can't load mid=#{mid}: #{([ e.to_s ] + e.backtrace).join("\n")}", true, $error_file);
      retry;
    end
  end

  def sync()
    data = [];

    now = Time.now();
    if(@time == 0)
      delta = 0.2;
      @time = now - delta;
    end

    if(@tag)
      data << @tag;
      @tag = nil;
    end

    delta = now - @time;
    @remaining += delta * @currentEntry.bitrate * 1000 / 8;
    begin
      @cur[@frame..-1].each { |f|
        data << f;
        @remaining -= f.bytesize();
        @frame     += 1;
        break if(@remaining <= 0)
      }

      self.next() if(@remaining > 0);
    end while(@remaining > 0)
    @time  = now;
    data;
  end
end
