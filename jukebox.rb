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
load 'json_api.rb'
load 'basic_api.rb'
load 'web_debug.rb'

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

json   = JsonManager.new(channelList, library);
basic  = BasicApi.new(channelList);
debug  = DebugPage.new();
main   = HttpNodeMapping.new("html");
stream = HttpNode.new();

main.addAuth() { |s, user, pass|
  next user if(user == "guest");
  next user if(authpam(user, pass) == true);
  nil;
}

root = HttpRootNode.new({ "/api/json" => json,
                          "/api"      => basic,
                          "/debug"    => debug,
                          "/"         => main,
                          "/stream"   => stream});

stream.addRequest(channelList, library) { |s, req, list, lib|
  module Stream
    def on_close()
      ch = @data;
      ch.unregister(self);
      super();
    end

    def write(data, low = false)
      if(@icyRemaining == 0 || low)
        super(data);
        return;
      end
      while(data.bytesize() != 0)
        if(@icyRemaining > data.bytesize())
          super(data);
          @icyRemaining -= data.bytesize();
          data     = "";
        else
          super(data[0..@icyRemaining-1]);
          data     = data[@icyRemaining..-1];
          generateIcyMetaData();
          @icyRemaining = @icyInterval;
        end
      end

      super(data)
    end

    def metaint()
      @icyInterval;
    end

    def stream_init(icy_meta)
      @icyInterval  = icy_meta == "1" && 4096 || 0;
      @icyRemaining = @icyInterval;
    end

    private
    def generateIcyMetaData()
      str  = "";
      ch   = @data;
      meta = ch.meta();

      if(meta && @meta != meta)
        str = "StreamTitle='#{meta.to_s().gsub("\'", " ")}';"
        @meta = meta;
      end
    
      padding = str.bytesize() % 16;
      padding = 16 - padding  if(padding != 0)
      str += "\x00" * padding;
      write((str.bytesize()/16).chr, true);
      write(str, true);
    end
  end

  action = req.remaining;
  channelName = s.user;
  ch = channelList[channelName];
  
  if(ch == nil)
    ch = Channel.new(channelName, lib);
    channelList[channelName] = ch;
  end

  s.extend(Stream);
  s.stream_init(req.options["Icy-MetaData"]);
  s.data = ch;
  metaint = s.metaint();
  rep = HttpResponse.new(req.proto, 200, "OK",
                         "Connection"   => "Close",
                         "Content-Type" => "audio/mpeg");
  rep.options["icy-metaint"] = metaint.to_s() if(metaint != 0);

  s.write(rep.to_s, true);
  ch.register(s);

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


