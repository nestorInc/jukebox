#!/usr/bin/env ruby

require 'rev'
require 'socket'
require 'http.rb'
require 'display.rb'
require 'db.rb'

class TokenManager < HttpNode
  def initialize(library)
    @library  = library;
    super();
  end


  def on_request(s, req)
    if(s.auth != "PAM" && s.auth != "guest")
      rep = HttpResponse.generate401(req);
      s.write(rep.to_s);
      return;
    end

    token = @library.create_token(s.user, rand(99999999999).to_s);
    rep   = nil;

    rep = HttpResponse.new(req.proto, 200, "OK",
                           "Content-Type" => "audio/x-mpegurl");
    rep.setData("http://#{Socket.gethostname}:#{s.local_address.ip_port}/stream?token=#{token}\n");
    s.write(rep.to_s);
  end

end
