#!/usr/bin/env ruby
$:.unshift File.dirname($0)

require 'rev'
require 'socket'
require 'cgi'
require 'yaml.rb'
require 'json'
require 'yaml'
require 'bcrypt'

require 'stream.rb'
require 'http.rb'
require 'channel.rb'
require 'encode.rb'
require 'user.rb'
require 'sessions.rb'
require 'library.rb'
require 'db.rb'
require 'json_api.rb'
require 'upload.rb'
require 'basic_api.rb'
require 'web_debug.rb'
require 'token_api.rb'
require 'user.rb'

raise("Not support ruby version < 1.9") if(RUBY_VERSION < "1.9.0");

$error_file = File.open("error.log", "a+");


# Config
config = {}
begin
  data   = File.open("jukebox.cfg", &:read);
  config = YAML.load(data);
rescue => e
  error("Config file error: #{([ e.to_s ] + e.backtrace).join("\n")}", true, $error_file);
end

begin
  pid_filename = config[:pid.to_s] || "jukebox.pid";
  old_pid = File.read(pid_filename);
rescue => e

end

if old_pid
  begin
    Process.getpgid( old_pid.to_i )
    error("Jukebox already started with pid #{old_pid}");
    exit
  rescue Errno::ESRCH
    File.delete(pid_filename);
  end
end

begin
  File.open(pid_filename, 'w') { |file| file.write(Process.pid) }
rescue => e
  error("Could not save pid #{pid_filename}");
end

library = Library.new();
users = Users.new()
sessions = Sessions.new()
db = DBlite.new("jukebox.db", [library, users, sessions]);
channelList = {};

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
json   = JsonManager.new(channelList, users, library, config[:upload.to_s], config[:encode.to_s]);
basic  = BasicApi.new(channelList);
upload = UploadManager.new(config[:upload.to_s]);
debug  = DebugPage.new();
token  = TokenManager.new(users, config);
main   = HttpNodeMapping.new("html");
main_src = HttpNodeMapping.new("html_src");
stream = Stream.new(channelList, library);

sessionsHttp = HttpSessionStateCollection.new;

main.addAuth() { |s, req, user, pass|
#  next nil if(s.ssl != true);

  # Remove invalid HttpSessionState objects from memory
  sessionsHttp.removeExpired();

  # For now we haven't attach the current request to any HttpSessionState
  currentSession = nil;

  # Remove invalid sessions in database
  sessions.invalidate();

  req.options = {} if req.options == nil

  isStreamPage = req.uri.path.end_with?("/stream");
  isMainPage = ['/','/index.html'].include?(req.uri.path);
  ip_address = s.remote_address.ip_address;
  user_agent = "";
  user_agent = req.options["User-Agent"] if( req.options["User-Agent"] )

  if req.uri.query or req.data
    form = nil;
    if req.data
      json = JSON.parse(req.data);
      form = json["login"] if(json and json["login"]);
    else
      form = Hash[URI.decode_www_form(req.uri.query)];
    end

    if(form and form["token"])
      token = form["token"];
      luser, uid = users.check_login_token(token);
      if luser
        sid = users.get_login_token_session(token);
        if not sid
          #TODO check if user has right to create session
          sid = sessions.create(uid, ip_address, user_agent);
          users.update_login_token_session(token, sid);
        end

        s.user.replace(luser);
        s.sid.replace(sid);
        user.replace(luser);
        stream.channel_init(luser);
        if not isStreamPage
          req.options["Set-Cookie"] = []
          req.options["Set-Cookie"] << Cookie.new({"session" => sid}, nil, "/", Time.now()+(2*7*24*60*60), nil, nil).to_s();
          req.options["Set-Cookie"] << Cookie.new({"user" => luser}, nil, "/", Time.now()+(2*7*24*60*60), nil, nil).to_s();
        end
        next "token"
      end
    end
  end

  if not isStreamPage and req.options["Cookie"]
    cookies = Hash[req.options["Cookie"].split(';').map{ |i| i.strip().split('=')}];
    if cookies["session"]
      session = cookies["session"];

      # Check if the session is known in RAM
      if sessionsHttp.exists(session)
        currentSession = sessionsHttp.get(session);
        luser = currentSession.Items["user"];
        uid = currentSession.Items["uid"];
      else # Check in db
        luser, uid = sessions.check(session, ip_address, user_agent);
        if luser
          currentSession = sessionsHttp.add(session, uid, luser, ip_address, user_agent);
        end
      end

      if luser
        s.user.replace(luser);
        s.sid.replace(session);
        user.replace(luser);
        stream.channel_init(luser);

        # Avoid update session last_access for each resources
        if isMainPage 
          currentSession.updateLastRequest() if currentSession;
          sessions.updateLastConnexion(session);
        end
        next "cookie"
      end
    end
  end

  if pass
    if(user != "void" and uid = users.login(user, pass) )
      sid = sessions.create(uid, ip_address, user_agent);

      if sessionsHttp.exists(sid)
        currentSession = sessionsHttp.get(sid);
      else
        currentSession = sessionsHttp.add(sid, uid, user, ip_address, user_agent);
      end

      stream.channel_init(s.user)
      s.sid.replace(sid)
      if not isStreamPage
        req.options["Set-Cookie"] = []
        req.options["Set-Cookie"] << Cookie.new({"session" => sid}, nil, "/", Time.now()+(2*7*24*60*60), nil, nil).to_s();
        req.options["Set-Cookie"] << Cookie.new({"user" => user}, nil, "/", Time.now()+(2*7*24*60*60), nil, nil).to_s();
      end
      next "httpAuth"
    end
  end

  nil;
}

root = HttpRootNode.new({ "/api/json"  => json,
                          "/api"       => basic,
                          "/upload"    => upload,
                          "/"          => main,
                          "/src"       => main_src,
                          "/api/token.m3u" => token,
                          "/stream"    => stream});
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
  File.delete(pid_filename);

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
