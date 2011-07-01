#!/usr/bin/env ruby

require 'rev'
require 'socket'

load 'http.rb'
load 'mp3.rb'

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
  def initialize(name, files)
    @name  = name;
    @files = files;
    @scks  = [];
    super();
    puts "Create new channel #{name}";
  end

  def name
    @name
  end

  def cron()
    trames = play();
    trames.each { |t|
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

  private
  def fetchData()
    p = @files[0];
    puts "Fetch channel #{@name}: #{p}";
    @files.rotate!();
    fd = File.open(p);
    data = fd.read();
    fd.close();
    data;    
  end
end

$library = ARGV;
channelList = {};

h = HttpServer.new();

h.addPath("/ch", channelList) { |s, req, list|
  uri = req.uri[4 .. -1];
  uri = "" if(uri == nil)
  channelName, action = uri.split("/", 2);
  if(channelName == "")
    channelName = "general";
  end
  ch = channelList[channelName];
  if(action == nil)
    options = {
      "Connection"   => "Close",
      "Content-type" => "audio/mpeg"};
    rep = HttpResponse.new(req.proto, 200, "OK", options);
    s.write(rep.to_s);

    if(ch == nil)
      ch = Mp3Channel.new(channelName, $library);
      channelList[channelName] = ch;
    end
    ch.register(s);

    s.on_disconnect(ch) { |s, ch|
      ch.unregister(s);
    }    
  else
    rep = HttpResponse.new(req.proto, 200, "OK");
    if(ch == nil)
      rep.setData("<html><head><title>Error</title></head><body><H1>Unknown channel #{channelName}</H1></body></head>");
    else
      case action
      when "next"
        rep.setData("<html><head><title>Error</title></head><body><H1>Next</H1></body></head>");
        ch.next()
      else
        rep.setData("<html><head><title>Error</title></head><body><H1>Unknown action #{action}</H1></body></head>");
      end
    end
    s.write(rep.to_s);
  end
}

h.attach(Rev::Loop.default)

Rev::Loop.default.run();


