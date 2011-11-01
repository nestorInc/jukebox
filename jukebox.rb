#!/usr/bin/env ruby

require 'rev'
require 'socket'
require 'cgi'
require 'yaml.rb'
require 'json'
require 'yaml'

load 'connection.rb'
load 'http.rb'
load 'mp3.rb'
load 'channel.rb'
load 'encode.rb'
load 'db.rb'
load 'jsonManager.rb'


config = {}
begin
  fd = File.open("jukebox.cfg");
  data = fd.read();
  config = YAML.load(data);
  fd.close;
rescue => e
  error("Config file error: #{e.to_s}");
end

library = Library.new();
json = JsonManager.new(library);

e = Encode.new(library, config["encode"]);
e.attach(Rev::Loop.default);

$error_file = File.open("error.log", "a+");

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

st = HttpNode.new() { |s, req|
  obj_kind = {}
  ObjectSpace.each_object { |obj|
    obj_kind[obj.class] = [] if(obj_kind[obj.class] == nil)
    obj_kind[obj.class].push(obj);
  }
  rep = HttpResponse.new(req.proto, 200, "OK");
  page = "<html><head><title>status</title></head><body>";
  if(obj_kind[Connection])
    page << "<table>";
    page << "<tr><th>Peer</th><th>SSL</th><th>User</th><th>Song</th><th>Sock out queue</th><tr>";
    obj_kind[Connection].each { |c|
      meta = c.ch.meta();
      page << "<tr>"
      page << "<td>#{c.socket.remote_address.inspect_sockaddr}</td>"
      page << "<td>#{c.socket.ssl != nil}</td>"
      page << "<td>#{c.socket.user}</td>"
      page << "<td>#{meta[3].gsub("\'", " ")} - #{meta[4].gsub("\'", " ")} - #{meta[5].gsub("\'", " ")}</td>"
      page << "<td>#{c.socket.output_buffer_size}</td>"
      page << "<tr>";
    }
  end

  if(obj_kind[EncodingThread])
    page << "<table>";
    page << "<tr><th>PID</th><th>File</th><th>Song</th><th>Bitrate</th></tr>";
    obj_kind[EncodingThread].each { |e|
      page << "<tr>"
      page << "<td>#{e.pid}</td>"
      page << "<td>#{e.file[1]}</td>"
      page << "<td>#{e.file[3].gsub("\'", " ")} - #{e.file[4].gsub("\'", " ")} - #{e.file[5].gsub("\'", " ")}</td>"
      page << "<td>#{e.file}</td>"
      page << "<td>#{e.bitrate}</td>"
      page << "<tr>";
    }
    
    page << "</table>";
  end
  page << "</body></head>";
  rep.setData(page);

  s.write(rep.to_s);  
}

h.addNode("/status", st)

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
              log("Loading #{value["plugin_name"]} plugin for songs selection")
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

  File.open("crash#{Time.now.to_i}", "w") { |fd|
    fd.puts(detail);
    fd.puts("----- Last events -----");
    fd.puts(dump_events);
  }
end


