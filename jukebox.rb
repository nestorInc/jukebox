#!/usr/bin/env ruby
$:.unshift File.dirname($0)

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
require 'messaging.rb'

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
db = DBlite.new(config[:encode.to_s] + "/jukebox.db", [library, users, sessions]);
channelList = {};
messaging = Messaging.new()

stream = Stream.new(channelList, library);

# Create HTTP server
json   = JsonManager.new(channelList, users, library, config[:upload.to_s], config[:encode.to_s]);
basic  = BasicApi.new(channelList);
upload = UploadManager.new(config[:upload.to_s]);
debug  = DebugPage.new();
login  = LoginManager.new("login", users, sessions, stream);
token  = TokenManager.new(users, config);
main   = HttpNodeMapping.new("html");
main_src = HttpNodeMapping.new("html_src");

def check_login(user, pass, s, req, users, sessions, stream)
  return nil if(pass == nil)
  return nil if(user == "void")

  uid, _ = users.login(user, pass)
  if(uid == nil)
    s.udata = nil;
    return nil
  end

  ip_address = s.remote_address;
  user_agent = req.options["User-Agent"] || ""

  sid = sessions.create(uid, ip_address, user_agent);

  stream.channel_init(user)
  s.udata = { :user => user, :session => sid }

  req.options["Set-Cookie"] = []
  req.options["Set-Cookie"] << Cookie.new({"session" => sid.sid }, nil, "/", Time.now()+(2*7*24*60*60), nil, nil).to_s();

  return "httpAuth"
end

def check_token(s, req, users, sessions, stream)
  return nil if req.uri.query == nil and req.data == nil
  form = if req.data
           begin
             if (req.options["Content-Type"] == "application/octet-stream")
               return nil;
             end
             json = JSON.parse(req.data);
           rescue => e
             return nil;
           end
           json["login"] if(json and json["login"]);
         else
           Hash[URI.decode_www_form(req.uri.query)];
         end

  token = form && form["token"];
  return nil if(form == nil)

  luser, uid = users.check_login_token(token);
  return nil if(luser == nil)

  sid = users.get_login_token_session(token);
  if not sid
    #TODO check if user has right to create session
    ip_address = s.remote_address;
    user_agent = req.options["User-Agent"] || ""

    sid = sessions.create(uid, ip_address, user_agent);
    users.update_login_token_session(token, sid);
  end

  s.udata = {:user => luser, :session => sid};
  stream.channel_init(luser);

  req.options["Set-Cookie"] = []
  req.options["Set-Cookie"] << Cookie.new({"session" => sid.sid}, nil, "/", Time.now()+(2*7*24*60*60), nil, nil).to_s();
  return "token"
end

def check_cookie(s, req, users, sessions, stream)
  ip_address = s.remote_address;
  user_agent = req.options["User-Agent"] || ""

  cookies = req.options["Cookie"]
  if(cookies == nil)
    debug("check_cookie: Nil cookies");
    return nil;
  end
  cookies = Hash[cookies.split(';').map{ |i| i.strip().split('=',2)}];

  return nil if cookies["session"] == nil
  session = cookies["session"];

  currentSession = s.udata;
  gotValidSession = false;

  if(currentSession && currentSession != "" && currentSession[:session].sid == session)
    gotValidSession = true;
  end

  if (!gotValidSession)
    uid = sessions.check(session, ip_address, user_agent);
    if (uid == nil)
      debug("check_cookie: invalid uid");
      return nil;
    end

    sid = sessions.get(uid, ip_address, user_agent)
    if (sid == nil)
      debug("check_cookie: invalid sid");
      return nil;
    end

    u = users.get(sid.uid)
    if (u == nil)
      debug("check_cookie: invalid user get");
      return nil;
    end

    currentSession = { :user => u, :session => sid }
    s.udata = currentSession;
    gotValidSession = true;
  end

  if (!gotValidSession)
    s.udata = nil;
    return nil;
  end

  stream.channel_init(currentSession[:user]);

#  currentSession[:sesssion].updateLastRequest() if currentSession;

  return "cookie"
end

login.addAuth() { |s, req, user, pass|
  "noAuth"
}

main.addAuth() { |s, req, user, pass|
#  next nil if(s.ssl != true);

  # For now we haven't attach the current request to any HttpSessionState
  currentSession = nil;

  # Remove invalid sessions in database
  sessions.purge();

  req.options = {} if req.options == nil

  m = check_token(s, req, users, sessions, stream) ||
  check_cookie(s, req, users, sessions, stream)

  if(m == nil)
    [ nil, HttpResponse.generate303(req, "/login") ]
  else
    [ m, nil ]
  end
}

root = HttpRootNode.new({ "/api/json"  => json,
                          "/api"       => basic,
                          "/upload"    => upload,
                          "/"          => main,
                          "/login"     => login,
                          "/src"       => main_src,
                          "/api/token.m3u" => token,
                          "/stream"    => stream});


class BugInfo
  attr_accessor :issue
  attr_accessor :frequency

  def initialize()
    @frequency = 0;
  end
end

begin
  # Main loop
  EM.run do
    $channelsCron = ChannelsCron.new();
    e = Encode.new(library, messaging, config[:encode.to_s]);
    if(config[:server.to_s] == nil)
      error("Config file error: no server section", true, $error_file);
      exit(1);
    end
    config[:server.to_s].each do |server_config|
      h = HttpServer.new(root, server_config);
    end
  end
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
