#!/usr/bin/env ruby

require 'rev'
require 'socket'
require 'http.rb'
require 'display.rb'
require 'db.rb'

class TokenManager < HttpNode
  def initialize(users, conf)
    @users  = users;
    @conf = conf;
    super();
  end


  def on_request(s, req)
    if(s.auth != "httpAuth" && s.auth != "cookie")
      rep = HttpResponse.generate401(req);
      s.write(rep.to_s);
      return;
    end

    token = @users.get_user_login_token(s.udata[:user]);
    if( token == nil )
      rep = HttpResponse.generate401(req);
      s.write(rep.to_s);
      return;
    end

    rep = HttpResponse.new(req.proto, 200, "OK",
                           "Content-Type" => "application/x-mpegURL");
    rep.setData("http://#{@conf['host']}/stream?token=#{token}\n");
    s.write(rep.to_s);
  end

end

class LoginManager < HttpNode
  def initialize(users, sessions, stream)
    @users    = users;
    @sessions = sessions;
    @stream   = stream;
    super();
  end


  def on_request(s, req)
    j = req.data && Hash[req.data.split("&").map { |v| v.split('=') }];
    user = j && j["user"]
    pass = j && j["pass"]

    if(user == nil || pass == nil)
      rep = HttpResponse.new(req.proto, 200, "OK",
                             "Content-Type" => "text/html");
      rep.setData('<HTML><HEAD><TITLE>Auth</TITLE></HEAD><BODY><FORM METHOD="POST"><INPUT NAME="pass" TYPE="text"/><INPUT NAME="user" TYPE="password"/><input type="submit" value="Submit"></FORM></BODY></HTML>');
      return s.write(rep.to_s);
    end
      
    uid = @users.login(user, pass)
    if(uid == nil)
      rep = HttpResponse.generate303(req, "/login")
      return s.write(rep.to_s);
    end

    ip_address = s.remote_address.ip_address;
    user_agent = req.options["User-Agent"] || ""

    sid = @sessions.create(uid, ip_address, user_agent);

    s.udata = { :user => user, :session => sid }
    @stream.channel_init(user)


    rep = HttpResponse.new(req.proto, 200, "OK",
                             "Content-Type" => "text/html");
    rep.setData('<HTML><HEAD><TITLE>Auth</TITLE></HEAD><BODY><H1>OK</H1></BODY></HTML>');
    rep.options["Set-Cookie"] = []
    rep.options["Set-Cookie"] << Cookie.new({"session" => sid.sid }, nil, "/", Time.now()+(2*7*24*60*60), nil, nil).to_s();
    s.write(rep.to_s);
  end

end
