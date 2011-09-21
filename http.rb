#!/usr/bin/env ruby

require 'date'

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
      val.strip();

      options[name] = val;
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
    @options["Content-length"] = data.bytesize();
    @options["Content-type"]   = contentType;

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

class HttpSession < Rev::TCPSocket
  @@logfd = nil;
  def initialize(socket, server)
    @server = server;
    @data   = "";
    @length = 0;
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

  def on_connect()
    log("connected");
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

class HttpServer < Rev::TCPServer
  @@logfd = nil;
  def initialize(port = 8082)
    @uri_table  = {};
    @path_table = {};
    
    log("starting http server")
    super(nil, port, HttpSession, self);
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
