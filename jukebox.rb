#!/usr/bin/env ruby

require 'rev'
require 'socket'
require 'cgi'
require 'yaml.rb'
require 'json'

load 'connection.rb'
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
n = HttpNode.new();
f = HttpNodeMapping.new("html");
h.addNode("/ch", n);
h.addNode("/", f);

n.addAuth() { |s, user, pass|
  next user if(user == pass);
  nil;
}

n.addRequest(channelList, library) { |s, req, list, lib|
  action = req.remaining;
  channelName = s.user;
  ch = channelList[channelName];
  if(action == nil)	
    options = {
      "Connection"   => "Close",
      "Content-Type" => "audio/mpeg"};

    if(ch == nil)
      ch = Channel.new(channelName, lib);
      channelList[channelName] = ch;
    end
    c = Connection.new(s, ch, req.options["Icy-MetaData"]);
    metaint = c.metaint();
    options["icy-metaint"] = metaint.to_s() if(metaint != 0);
    rep = HttpResponse.new(req.proto, 200, "OK", options);
    s.write(rep.to_s);
    ch.register(c);

    s.on_disconnect(ch, c) { |s, ch, c|
      ch.unregister(c);
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
        json_obj = json.s_to_obj(query);
        client_timestamp = json_obj.delete("timestamp");
        # TODO change the action state
        if(json_obj.size == 0)
          json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, client_timestamp, ch.getConnected());
          json_str = json.get_info_reply();
        end
        json_obj.each { |type, value|
          case(type)
          when "search"
            json.on_search_request(lib, value);
            json_str = json.get_search_reply();
          when "action"
            case(value["name"])
            when "next"
              ch.next();
              json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, client_timestamp, ch.getConnected());
              json_str = json.get_info_reply();
            when "previous"
              ch.previous();
              json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, client_timestamp, ch.getConnected());
              json_str = json.get_info_reply();
            when "add_to_play_queue"
              ch.playlist_add(value["play_queue_index"], value["mid"])
              json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, 0, ch.getConnected());
              json_str = json.get_info_reply();
            when "remove_from_play_queue"
              ch.playlist_rem(value["play_queue_index"])
              json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, 0, ch.getConnected());
              json_str = json.get_info_reply();
            when "move_in_play_queue"
              ch.playlist_move(value["play_queue_index"], value["new_play_queue_index"])
              json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, 0, ch.getConnected());
              json_str = json.get_info_reply();
            when "select_plugin"
              # TODO handle exception, check file existence ...
              load "plugins/" + value["plugin_name"] + ".rb"
              ch.extend Plugin
              ch.plugin_name = value["plugin_name"]
              json.on_refresh_request(ch.mids, ch.pos, lib, ch.timestamp, client_timestamp, ch.getConnected());
              json_str = json.get_info_reply();
            end
          end
        }
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
rescue Errno::ETIMEDOUT
  retry;
rescue Errno::EHOSTUNREACH
  retry;
rescue => e
  fd = File.open("exception_stat", File::RDONLY | File::CREAT, 0600);
  data = fd.read();
  stat = YAML::load(data);
  stat = {} if(stat == false);
  fd.close();

  detail = ([ e.to_s ] + e.backtrace).join("\n")
  puts detail;
  stat[detail]  = 0 if(stat[detail] == nil);
  stat[detail] += 1;

  fd = File.open("exception_stat", "w");
  data = YAML::dump(stat);
  fd.write(data);
  fd.close();
end


