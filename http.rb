#!/usr/bin/env ruby

require 'date'
require 'rev/ssl'

class HttpRequest
  attr_reader :method;
  attr_reader :options;
  attr_reader :proto;
  attr_reader :uri;
  attr_reader :data;

  def initialize(method, uri, proto, options = {})
    @options = options;
    @method  = method;
    @proto   = proto;
    @uri     = uri;
  end

  def HttpRequest.parse(header)
    lines = header.split("\r\n");
    request_line = lines.shift(1)[0];
    method, uri, proto = request_line.split(/[ \t]/);
    options = {}
    lines.each { |l|
      name, val = l.split(":", 2)
      options[name] = val.strip();
    }
    HttpRequest.new(method, uri, proto, options);
  end

  def addData(data)
    @data = data;
  end


  def to_s()
    # Header
    data = "#{@method} #{@uri} #{@proto}\r\n";
    @options.each { |name, val|
      data << "#{name}: #{val}\r\n";
    }
    data << "\r\n";
    # Body
    data << @data if(@data)
    data;
  end
end

class HttpResponse
  attr_reader :status;
  attr_reader :options;
  attr_reader :proto;
  attr_reader :reason;
  attr_reader :data;

  def initialize(proto, status, reason, options = {})
    @options  = options;
    @proto    = proto;
    @status   = status;
    @reason   = reason;
  end

  def HttpResponse.parse(header)
    lines = header.split("\r\n");
    request_line = lines.shift(1)[0];
    proto, status, reason = request_line.split(/[ \t]/);
    options = {}
    lines.each { |l|
      name, val = l.split(":", 2)
      val.strip();

      options[name] = val;
    }
    HttpResponse.new(proto, status, reason, options);
  end

  def setData(data, contentType = "text/html")
    @options["Connection"]     = "keep-alive",
    @options["Content-Length"] = data.bytesize();
    @options["Content-Type"]   = contentType;

    @data = data;
  end

  def to_s()
    # Header
    data = "#{@proto} #{@status} #{@reason}\r\n";
    @options.each { |name, val|
      data << "#{name}: #{val}\r\n";
    }
    data << "\r\n";
    # Body
    data << @data if(@data)
    data;
  end
end

class HttpSession < Rev::SSLSocket
  @@logfd = nil;
  def initialize(socket, server, ssl = nil)
    @server = server;
    @data   = "";
    @length = 0;
    @ssl    = ssl;
    super(socket);
  end

  def on_disconnect(*args, &block)
    @close_block = block;
    @close_args  = args;
  end

  private
  def log(str)
    if(@@logfd == nil)
      @@logfd = File.open("http.log", "a+");
      @@logfd.sync = true;
    end
    @@logfd.write("#{DateTime.now()} #{remote_addr}:#{remote_port} #{str}\n");
  end

  def ssl_context
    @_ssl_context = OpenSSL::SSL::SSLContext.new();
    @_ssl_context.set_params;
    @_ssl_context.cert = OpenSSL::X509::Certificate.new(File.open("serv.crt"));
    @_ssl_context.key  = OpenSSL::PKey::RSA.new(File.open("serv.key"));
    @_ssl_context.verify_mode = OpenSSL::SSL::VERIFY_NONE;
    @_ssl_context;
  end

  def on_connect
    log("connected");
    if(@ssl)
      extend Rev::SSL
      @_connecting ? ssl_client_start : ssl_server_start
    end
  end

  def on_close()
    log("disconnected");
    if(@close_block)
      @close_block.call(self, *@close_args);
    end
  end
      
  def on_read(data)
    @data << data;
    while(@data.bytesize != 0)
      # Decode header
      if(@length == 0)
        header, body = @data.split("\r\n\r\n", 2);        
        break if(body == nil);

        @req = HttpRequest.parse(header);
        length = @req.options["Content-Length"];
        if(length == nil)
          @length = 0;
        else
          @length = length.to_i();
        end
        @data = body;
      end

      if(@data.bytesize() >= @length)
        @req.addData(@data.slice!(0 .. @length - 1)) if(@length != 0);
        log(@req);
        @server.findUri(self, @req);
      end
    end
  end
end

class HttpServer
  @@logfd = nil;
  def initialize(port = 8080, sport = 8082)
    @uri_table  = {};
    @path_table = {};
    @srv        = [];

    log("starting http server")
    @srv << Rev::TCPServer.new(nil, port, HttpSession, self);
    @srv << Rev::TCPServer.new(nil, sport, HttpSession, self, true) if(sport);
  end

  def attach(loop)
    @srv.each { |s|
      s.attach(loop)
    }
  end

  def addFile(uri, *data, &block)
    @uri_table[uri] = [ block, data ];
  end

  def addPath(path, *data, &block)
    if (path[-1] == "/")
      path = path[0 .. -2];
    end
    @path_table[path] = [ block, data ];
  end

  def findUri(s, req)
    uri  = req.uri;
    page = @uri_table[uri];
    while(page == nil && uri != "")
      page = @path_table[uri];
      uri  = uri.scan(/(.*)\/(.*)/)[0];
      if(uri)
        uri  = uri[0];
      else
        uri  = "";
      end
    end

    if(page)
      page[0].call(s, req, *page[1]);
    else
      rep = HttpResponse.new(req.proto, 404, "Not found");

      rep.setData("<html><head><title>404 Not found</title></head><body><H1>Page not found</H1></body></head>");
      s.write(rep.to_s);
    end
  end

  private
  def log(str)
    if(@@logfd == nil)
      @@logfd = File.open("http.log", "a+");
      @@logfd.sync = true;
    end
    @@logfd.write("#{DateTime.now()} #{str}\n");
  end
end
