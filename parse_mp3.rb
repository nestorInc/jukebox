#!/usr/bin/env ruby

require 'rev'
require 'socket'

load 'http.rb'
load 'mp3.rb'


library = ARGV;


data = STDIN.read();
s = Mp3Stream.new(data)

s.start();

class Timer_test < Rev::TimerWatcher
  def initialize(s)
    super(0.2, true);
    @stream = s;
  end
  
  def on_timer
    trames = @stream.play();
    STDERR.puts trames.size;
    trames.each { |t|
#      STDOUT.write(t);
    }
  end
end


t = Timer_test.new(s)
t.attach(Rev::Loop.default)


h = HttpServer.new();
h.addFile("/test") { |s, req, data|
  rep = HttpResponse.new(req.proto, 200, "OK");
  rep.setData("<html><head><title>test</title></head><body><H1>MY test</H1></body></head>");
  s.write(rep.to_s);
}

h.addPath("/session") { |s, req, data|
  rep = HttpResponse.new(req.proto, 200, "OK");
  rep.setData("<html><head><title>session</title></head><body><H1>MY session #{req.uri}</H1></body></head>");
  s.write(rep.to_s);
}

#  options = {
#    "Connection"   => "Close",
#    "Content-type" => "audio/mpeg"};


h.attach(Rev::Loop.default)

Rev::Loop.default.run();


