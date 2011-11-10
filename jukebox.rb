#!/usr/bin/env ruby

require 'rev'
require 'socket'
require 'cgi'
require 'yaml.rb'
require 'json'
require 'yaml'
require 'rpam'
include Rpam

load 'connection.rb'
load 'http.rb'
load 'mp3.rb'
load 'channel.rb'
load 'encode.rb'
load 'db.rb'
load 'jsonManager.rb'

raise("Not support ruby version < 1.9") if(RUBY_VERSION < "1.9.0");

$error_file = File.open("error.log", "a+");

config = {}
begin
  fd = File.open("jukebox.cfg");
  data = fd.read();
  config = YAML.load(data);
  fd.close;
rescue => e
  error("Config file error: #{e.to_s}", true, $error_file);
end

library = Library.new();
json = JsonManager.new(library);

Thread.new() {
  begin
    e = Encode.new(library, config[:encode.to_s]);
    e.attach(Rev::Loop.default);
    Rev::Loop.default.run();
  rescue => e
    error(e, true, $error_file);
  end
}

channelList = {};

root = HttpRootNode.new();
n = HttpNode.new();
f = HttpNodeMapping.new("html");
root.addNode("/ch", n);
root.addNode("/", f);

n.addAuth() { |s, user, pass|
  next user if(user == "guest");
  next user if(authpam(user, pass) == true);
  nil;
}

st = HttpNode.new() { |s, req|
  obj_kind = {}
  GC.start
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
      page << "<td>#{c.socket.ssl == true}</td>"
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

root.addNode("/status", st)

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
        options = {
        "Content-Type" => "application/json"};
        query = CGI::unescape(req.data);
        argv = query.split(/&/).map { |v|
          v.split(/\=/);
        };
        argv = Hash[argv];
        res = JsonManager.parse(argv["query"], library, ch);
        rep.setData(res);
      else
        rep.setData("<html><head><title>Error</title></head><body><H1>Unknown action #{action}</H1></body></head>");
      end
    end
    s.write(rep.to_s);
  end
}

if(config[:server.to_s] == nil)
  error("Config file error: no server section", true, $error_file);
  exit(1);
end
config[:server.to_s].each { |server_config|
  h = HttpServer.new(root, server_config);
  h.attach(Rev::Loop.default)
}

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


