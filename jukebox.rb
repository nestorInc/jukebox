#!/usr/bin/env ruby

require 'rev'
require 'socket'
require 'cgi'

load 'http.rb'
load 'mp3.rb'
load 'channel.rb'
load 'encode.rb'

e = Encode.new(ARGV[0], ARGV[1]);
e.attach(Rev::Loop.default);

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
      ch = Mp3Channel.new(channelName, e);
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
      when "control"
        params = req.data.split(/&/);

        p CGI::unescape(req.data)

      else
        rep.setData("<html><head><title>Error</title></head><body><H1>Unknown action #{action}</H1></body></head>");
      end
    end
    s.write(rep.to_s);
  end
}

h.attach(Rev::Loop.default)

Rev::Loop.default.run();


