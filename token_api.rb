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
