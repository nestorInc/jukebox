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
  def initialize(name, e)
    @name    = name;
    @enc     = e;
    @scks    = [];
    @history = []
    @pos     = 0;
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

  private
  def fetchData()
    if(@history[@pos] == nil)
      files = @enc.files();
      p = files[rand(files.size())];
      @history.push(p);
    else
      p = @history[@pos];
    end
    @pos += 1;
    puts "Fetch channel #{@name}: #{p}";
    fd = File.open(p);
    data = fd.read();
    fd.close();
    data;    
  end
end
