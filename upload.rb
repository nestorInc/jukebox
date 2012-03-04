#!/usr/bin/env ruby

require 'json'
require 'rev'
require 'http.rb'
require 'display.rb'

class UploadManager < HttpNode

  def initialize()
    super();
  end

  def on_request(s, req)
    warning('File uploaded : uploads/' + req.options['X-File-Name']);

    begin
      Dir.mkdir('uploads');
    rescue Exception=>e
      warning(e);
    end
    begin
      File.open('uploads/' + req.options['X-File-Name'], 'w') {|f| 
        f.write(req.data);
      }
    rescue Exception=>e
      error(e);
      rep = HttpResponse.new(req.proto, 503, "Error",
                           "Content-Type" => "application/json");
      res = '{ error: Could not save uploaded file., success: false}';
      rep.setData(res);
      s.write(rep.to_s);
      return;
    end
    rep = HttpResponse.new(req.proto, 200, "OK",
                           "Content-Type" => "application/json");
    res = '{ success: true}';
    rep.setData(res);
    s.write(rep.to_s);

  end
end
