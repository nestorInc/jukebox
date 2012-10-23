#!/usr/bin/env ruby
$:.unshift File.dirname($0)

require 'rev'
require 'socket'
require 'cgi'
require 'yaml.rb'
require 'json'
require 'yaml'
require 'rpam'

include Rpam

require 'stream.rb'
require 'http.rb'
require 'channel.rb'
require 'encode.rb'
require 'db.rb'
require 'json_api.rb'
require 'upload.rb'
require 'basic_api.rb'
require 'web_debug.rb'

raise("Not support ruby version < 1.9") if(RUBY_VERSION < "1.9.0");

$error_file = File.open("error.log", "a+");

library = Library.new();
channelList = {};

# Config

config = {}
begin
  data   = File.open("jukebox.cfg", &:read);
  config = YAML.load(data);
rescue => e
  error("Config file error: #{([ e.to_s ] + e.backtrace).join("\n")}", true, $error_file);
end

# Encode

Thread.new() {
  e = Encode.new(library, config[:encode.to_s]);
  e.attach(Rev::Loop.default);
  begin
    Rev::Loop.default.run();
  rescue => e
    error(([ e.to_s ] + e.backtrace).join("\n"), true, $error_file);
    retry;
  end
}


# Create HTTP server
json   = JsonManager.new(channelList, library, config[:upload.to_s], config[:encode.to_s]);
basic  = BasicApi.new(channelList);
upload = UploadManager.new(config[:upload.to_s]);
debug  = DebugPage.new();
main   = HttpNodeMapping.new("html");
stream = Stream.new(channelList, library);

main.addAuth() { |s, req, user, pass|
#  next nil if(s.ssl != true);
  if(req.uri.query)
    form = Hash[URI.decode_www_form(req.uri.query)] ;
    if(form["token"])
      token = form["token"];
      luser = library.check_token(token);

      if(luser)
        user.replace(luser);
        next "token"
      end
    end
  end
  if(pass)
    next "guest" if(user == "guest");
    next "PAM"   if(authpam(user, pass) == true);
  end
  nil;
}

root = HttpRootNode.new({ "/api/json" => json,
                          "/api"      => basic,
                          "/upload"   => upload,
                          "/"         => main,
                          "/stream"   => stream});
#                          "/debug"    => debug,

if(config[:server.to_s] == nil)
  error("Config file error: no server section", true, $error_file);
  exit(1);
end
config[:server.to_s].each { |server_config|
  h = HttpServer.new(root, server_config);
  h.attach(Rev::Loop.default)
}

class BugInfo
  attr_accessor :issue
  attr_accessor :frequency

  def initialize()
    @frequency = 0;
  end
end

# Main loop
begin
  Rev::Loop.default.run();
rescue => e
  stat = YAML::load(File.open("exception_stat", File::RDONLY | File::CREAT, 0600));
  stat = {} if(stat == false);

  detail = ([ e.to_s ] + e.backtrace).join("\n")
  puts detail;
  stat[detail]  = BugInfo.new() if(stat[detail] == nil);
  info = stat[detail];
  info.frequency += 1;

  #create redmine ticket
  if(config["redmine"])
    require 'redmine_client'
    cfg = config["redmine"];
    RedmineClient::Base.configure do
      self.site     = cfg["site"];
      self.user     = cfg["user"];
      self.password = cfg["password"];
    end

    # New bug
    if(info.issue == nil)
      issue = RedmineClient::Issue.new(:subject     => e.to_s,
                                       :project_id  => cfg["project_id"],
                                       :description => detail);
      
      if(issue.save)
        info.issue = issue.id
      else
        puts issue.errors.full_messages
      end
    end
    # Add comment
    if(info.issue)
      issue = RedmineClient::Issue.find(info.issue);
      issue.notes = dump_events() + "\n";
      issue.save
    end
  end

  File.open("exception_stat", "w") { |fd| fd.write(YAML::dump(stat)); }

  report = detail;
  report << "\n"
  report << "----- Last events -----\n"
  report << dump_events();
  report << "\n"

  File.open("crash#{Time.now.to_i}", "w") { |fd|
    fd.write(report)
  }
end
