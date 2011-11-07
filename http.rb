#!/usr/bin/env ruby

require 'date'
require 'rev/ssl'
require 'uri'

class HttpRequest
  attr_reader   :method;
  attr_reader   :options;
  attr_reader   :proto;
  attr_reader   :uri;
  attr_reader   :data;
  attr_accessor :prefix;
  attr_accessor :remaining;

  def initialize(method, uri, proto, options = {})
    @options = options;
    @method  = method;
    @proto   = proto;
    @uri     = uri;
  end

  def HttpRequest.parse(header)
    lines = header.split("\r\n");
    request_line = lines.shift(1)[0];
    method, page, proto = request_line.split(/[ \t]/);
    options = {}
    lines.each { |l|
      name, val = l.split(":", 2)
      options[name] = val.strip();
    }
    uri = URI.parse(page);
    HttpRequest.new(method, uri, proto, options);
  end

  def addData(data)
    @data = data;
  end


  def to_s()
    # Header
    data = "#{@method} #{@uri.path} #{@proto}\r\n";
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

  def HttpResponse.generate404(req)
    rsp = HttpResponse.new(req.proto, 404, "Not found");
    rsp.setData("<html><head><title>404 Not found</title></head><body><H1>Page not found</H1></body></head>");
    rsp;
  end

  def HttpResponse.generate401(req, realm = "")
    rsp = HttpResponse.new(req.proto, 401, "Unauthorized");
    rsp.options["WWW-Authenticate"] = "Basic realm=\"#{realm}\"";
    rsp.setData("<html><head><title>401 Unauthorized</title></head><body><H1>Unauthorized</H1></body></head>");
    rsp;
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
  attr_reader :user;
  attr_reader :ssl;

  @@logfd = nil;
  def initialize(socket, root, options = {})
    @root        = root;
    @data        = "";
    @length      = nil;
    @ssl         = options[:ssl.to_s] || false;
    @certificate = options[:certificate.to_s];
    @key         = options[:key.to_s];
    @user        = nil;
    super(socket);
  end

  def on_disconnect(*args, &block)
    @close_block = block;
    @close_args  = args;
  end

  def remote_address()
    @_io.remote_address();
  end

  private
  def log(str)
    if(@@logfd == nil)
      @@logfd = File.open("http.log", "a+");
      @@logfd.sync = true;
    end
    super(str, false, @@logfd);
  end

  def ssl_context
    @_ssl_context = OpenSSL::SSL::SSLContext.new();
    @_ssl_context.set_params;
    @_ssl_context.cert = OpenSSL::X509::Certificate.new(File.open(@certificate)) if(@certificate);
    @_ssl_context.key  = OpenSSL::PKey::RSA.new(File.open(@key)) if(@key);
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

  #durty fix for catch exception
  def on_readable
    begin
      on_read @_io.read_nonblock(INPUT_SIZE)
    rescue Errno::EAGAIN
    rescue Errno::ECONNRESET, EOFError, Errno::ETIMEDOUT, Errno::EHOSTUNREACH
      close
    end
  end
      
  def on_read(data)
    debug("HTTP data\n" + data);
    @data << data;
    while(@data.bytesize != 0)
      # Decode header
      if(@length == nil)
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

      break if(@data.bytesize() < @length);

      @req.addData(@data.slice!(0 .. @length - 1)) if(@length != 0);
      log(@req);
      auth    = nil;
      request = nil;

      uri  = @req.uri.path.split("/");
      uri.delete_if {|n| n == "" };

      nodes = @root.scan(uri);

      depth = nodes.size();
      # find auth methode
      depth.downto(0) { |i|
        begin
          auth = nodes[i].method(:auth)
        rescue NameError => e
        else
          break;
        end
      }
      v = @req.options["Authorization"];
      if(v != nil && auth != nil)
        method, code = v.split(" ", 2);
        if(method == "Basic" && code != nil)
          @user, pass = code.unpack("m").first.split(":", 2);
          @uid = auth.call(self, @user, pass);
        end
      end
      if(@uid == nil and auth != nil)
        rsp = HttpResponse.generate401(@req)
        write(rsp.to_s);
        @length = nil;
        next
      end

      pos = 0;
      depth.downto(0) { |i|
        begin
          request = nodes[i].method(:request)
        rescue NameError => e
        else
          pos = i;
          break;
        end 
      }
      if(request == nil)
        rsp = HttpResponse.generate404(@req)
        write(rsp.to_s);
        next;
      end
      prefix = "/";
      if(pos != 0)
        prefix += uri[0..pos-1].join("/");
      end
      remaining = nil
      remaining = uri[pos..-1].join("/") if(pos != uri.size);
      
      @req.remaining = remaining;
      @req.prefix    = prefix;

      request.call(self, @req);
      @length = nil;
    end
  end
  private
end

class HttpNode
  attr_accessor :child

  def initialize(child = {}, *args, &block)
    @child = child;

    addRequest(*args, &block) if(block);
  end

  def addAuth(*args, &block)
    @authArgs   = args;
    @authBlock  = block;

    def self.auth(s, user, pass)
      @authBlock.call(s, user, pass, *@authArgs);
    end
  end

  def addRequest(*args, &block)
    @requestArgs   = args;
    @requestBlock  = block;

    def self.request(s, req)
      @requestBlock.call(s, req, *@requestArgs);
    end
  end

  def scan(path)
    depth   = 0;
    n       = self;
    nodes   = [ self ];

    while(path[depth] != nil)
      n = n.child[path[depth]];
      break if(n == nil);
      nodes.push(n)
      depth += 1;
    end

    nodes;
  end

  def add(path, node)
    n       = self;
    
    if(path.size == 0)
      node.child = @child;
      return node;
    end

    path.each { |v|
      e = n.child[v];
      if(path.last.__id__ == v.__id__)
        node.child = n.child[v].child if(e != nil);
        n.child[v] = node;
      else
        if(e == nil)
          e = HttpNode.new();
          n.child[v] = e;
        end
      end
      n = e;
    }
    self;
  end
end

class HttpNodeMapping < HttpNode
  ContentTypeTab = {
    "css"  => "text/css",
    "html" => "text/html",
    "htm"  => "text/html",
    "js"   => "text/javascript",
    "png"  => "image/png",
    "jpg"  => "image/jpeg",
    "gif"  => "image/gif",
    "txt"  => "text/plain",
    nil    => "application/octet-stream"
  }

  def initialize(dir)
    @dir = dir;
    st   = File.stat(@dir);
    raise "Not directory" if(st.directory? != true);
  end

  def request(s, req)
    path = @dir + "/";
    path += req.remaining if(req.remaining != nil)

    begin
      st   = File.stat(path);
      if(st.directory? == true)
        path += "/index.html"
        st   = File.stat(path);
      end
    rescue Errno::ENOENT
      rsp = HttpResponse.generate404(req)
      s.write(rsp.to_s);
      return;
    end
    ext  = path.scan(/.*\.(.*)/).first;
    contentType = nil;
    contentType = ContentTypeTab[ext.first]  if(ext);
    contentType = ContentTypeTab[nil]        if(contentType == nil);

    rsp  = HttpResponse.new(req.proto, 200, "OK");
    data = File.read(path)
    rsp.setData(data, contentType);
    s.write(rsp.to_s);
  end
end

class HttpRootNode
  def initialize()
    @root = HttpNode.new();
  end

  def addNode(path, node)
    uri  = path.split("/");
    uri.delete_if {|n| n == "" };

    @root = HttpNode.new() if(@root == nil);
    @root = @root.add(uri, node);
  end

  def scan(path)
    @root.scan(path)
  end
end

class HttpServer < Rev::TCPServer
  attr_reader :root

  @@logfd = nil;
  def initialize(root = nil, options = {})
    port = options[:port.to_s] || 8080;

    @root   = root
    @root ||= HttpRootNode.new();

    log("starting http server")
    super(nil, port, HttpSession, @root, options);
  end

  private
  def log(str)
    if(@@logfd == nil)
      @@logfd = File.open("http.log", "a+");
      @@logfd.sync = true;
    end
    super(str, false, @@logfd);
  end
end
