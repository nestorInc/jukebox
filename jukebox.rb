#!/usr/bin/env ruby

require 'rev'
require 'socket'
require 'cgi'
require 'yaml.rb'
require 'json'

load 'http.rb'
load 'mp3.rb'
load 'channel.rb'
load 'encode.rb'
load 'db.rb'
load 'jsonManager.rb'

library = Library.new();
json = JsonManager.new(library);

e = Encode.new(library, ARGV[0], ARGV[1]);
e.attach(Rev::Loop.default);

channelList = {};

h = HttpServer.new();

h.addPath("/ch", channelList, library) { |s, req, list, lib|
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
      "Content-Type" => "audio/mpeg"};
    rep = HttpResponse.new(req.proto, 200, "OK", options);
    s.write(rep.to_s);

    if(ch == nil)
      ch = Channel.new(channelName, lib);
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
      case(action)
      when "previous"
        rep.setData("<html><head><title>Previous</title></head><body><H1>Previous</H1></body></head>");
        ch.previous()
      when "next"
        rep.setData("<html><head><title>next</title></head><body><H1>Next</H1></body></head>");
        ch.next()
      when "control"
        params = req.data.split(/&/);
        options = {
        "Content-Type" => "application/json"};
        req.data.gsub!(/%23/, '');
        req.data.gsub!(/%26/, '');
        req.data.gsub!(/%3B/,'');
        req.data.gsub!(/%29/, '');
        query = CGI::unescape(req.data);
        #p query;
        json_obj = json.s_to_obj(query);
        if(json_obj["action"] == "next")
          ch.next();
          json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, ch.getConnected());
          json_str = json.get_info_reply();
        elsif(json_obj["action"] == "previous")
          ch.previous();
          json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, ch.getConnected());
          json_str = json.get_info_reply();
        # TODO change the action state
        elsif(json_obj["action"] == nil)
          if(json_obj["search"] == nil)
            json.on_search_error();
            json_str = json.get_search_reply();
          else
            json.on_search_request(lib, json_obj["search"]);
            json_str = json.get_search_reply();
          end
        elsif(json_obj["action"] = "refresh")
          if(json_obj["search"] == nil)
            json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, ch.getConnected());
            json_str = json.get_info_reply();
          else
            json.on_search_request(lib, json_obj["search"]);
            json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, ch.getConnected());
            json_str = json.get_info_search_reply();
          end
        else
          json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, ch.getConnected());
          json_str = json.get_info_reply();
        end
 
       # puts json_str;
        rep.setData(json_str);
      else
        rep.setData("<html><head><title>Error</title></head><body><H1>Unknown action #{action}</H1></body></head>");
      end
    end
    s.write(rep.to_s);
  end
}

h.attach(Rev::Loop.default)

begin
  Rev::Loop.default.run();
rescue => e
  fd = File.open("exception_stat", File::RDONLY | File::CREAT, 0600);
  data = fd.read();
  stat = YAML::load(data);
  stat = {} if(stat == false);
  fd.close();

  detail = ([ e.class ] + e.backtrace).join("\n")
  puts detail;
  stat[detail]  = 0 if(stat[detail] == nil);
  stat[detail] += 1;

  fd = File.open("exception_stat", "w");
  data = YAML::dump(stat);
  fd.write(data);
  fd.close();
end


