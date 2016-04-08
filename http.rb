#!/usr/bin/env ruby
# -*- coding: utf-8 -*-

require 'date'
require 'rev/ssl'
require 'uri'

# HttpServer create new HttpSession for each HTTP connection
# Http server have HttpRootNode. this object represent the hierarchie
# of ressource
#
# HttpNode have two blocks:
#  * For authentification
#  * For data
# If block is not present we search on top level
# Special case:
#  * Authentification is not found, the server not require authentification
#  * Ressource is not found, the server response 404 Not found error
#
# On HTTP Request we have two fields:
#  * prefix is containt path for used node
#  * remaining is containt extra path after node
#
# Structure of HTTP node
# HttpRootNode
# |-HttpNode (root) (No Auth)
#  |- HttpNode ("toto") (No Auth)
#  |- HttpNode ("titi") (No Ressource, Auth)
#   |- HttpNode ("42") (No Auth)
#   |- HttpNode ("666") (No Auth)
# Example
#  request "/toto"
#   * check authentification on toto (not found)
#   * check authentification on root (not found)
#   * no authentification require
#   * get ressource on toto
#   * HttpRequest prefix=/toto, remaining=nil
#  request "/titi/42/33"
#   * check authentification on 42 (not found)
#   * check authentification on titi (found)
#   * check http authentification
#   * get ressource on titi
#   * HttpRequest prefix=/titi/42, remaining=33

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
    begin
      lines = header.split("\r\n");
      # parse response line
      request_line = lines.shift(1)[0]; 
      method, page, proto = request_line.split(/[ \t]/);
      return nil if(proto == nil);
      # decode header options
      options = {}
      lines.each { |l|
      name, val = l.split(":", 2)
      val ||= "";
      options[name] = val.strip();
      }
      uri = URI.parse(page);
    rescue
      return nil;
    end
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
    # parse response line
    response_line = lines.shift(1)[0];
    proto, status, reason = response_line.split(/[ \t]/);
    # decode header options
    options = {}
    lines.each { |l|
      name, val = l.split(":", 2)
      val ||= "";
      val.strip();

      options[name] = val;
    }
    HttpResponse.new(proto, status, reason, options);
  end

  def HttpResponse.generateError(req, val, msg)
    rsp = HttpResponse.new(req.proto, val, msg);
    rsp.setData("<html><head><title>#{val} #{msg}</title></head><body><H1>#{msg}</H1></body></head>");
    rsp;
  end

  def HttpResponse.generateMoveError(req, val, msg, location)
    rsp = HttpResponse.new(req.proto, val, msg, "Location" => location);
    rsp.setData("<html>
<head>
<meta http-equiv=\"Refresh\" content=\"0; url=#{location}\" />
<title>#{val} #{msg}</title>
</head>
<body>
<h1>#{msg}</h1>
<p>This page has moved to <a href=\"#{location}\">Here</a>.</p>
</body>
</html>");
    rsp;
  end

  def HttpResponse.generate301(req, location)
    HttpResponse.generateMoveError(req, 301, "Moved Permanently", location);
  end

  def HttpResponse.generate302(req, location)
    HttpResponse.generateMoveError(req, 302, "Found", location);
  end

  def HttpResponse.generate301(req, location)
    HttpResponse.generateMoveError(req, 301, "Moved Permanently", location);
  end

  def HttpResponse.generate403(req, realm = "")
    rsp = HttpResponse.generateError(req, 403, "Forbidden");
    rsp;
  end

  def HttpResponse.generate404(req)
    HttpResponse.generateError(req, 404, "Not found");
  end

  def HttpResponse.generate405(req)
    HttpResponse.generateError(req, 405, "Method Not Allowed");
  end

  def HttpResponse.generate401(req, realm = "")
    rsp = HttpResponse.generateError(req, 401, "Unauthorized");
    rsp.options["WWW-Authenticate"] = "Basic realm=\"#{realm}\"";
    rsp;
  end


  def HttpResponse.generate500(req)
    HttpResponse.generateError(req, 500, "Internal Server Error");
  end

  def setData(data, contentType = nil)
    @options["Connection"]     ||= "keep-alive";
    @options["Content-Length"]   = data.bytesize();
    @options["Content-Type"]     = contentType || @options["Content-Type"] || "text/html";

    @data = data;
  end

  def to_s()
    # Header
    data = "#{@proto} #{@status} #{@reason}\r\n";
    @options.each { |name, val|
      if(val.kind_of?(Array))
        val.each{ |subval|
          data << "#{name}: #{subval}\r\n";
        }
      else
        data << "#{name}: #{val}\r\n";
      end
    }
    data << "\r\n";
    # Body
    data << @data if(@data)
    data;
  end
end

# Dirty fix for catch exception
module SocketDirtyFix
  def on_readable
    begin
      super();
    rescue Errno::EAGAIN
    rescue Errno::ECONNRESET, EOFError, Errno::ETIMEDOUT, Errno::EHOSTUNREACH
      close
    end
  end
end

class HttpSessionStateCollection
  def initialize()
    @items = Hash.new;
  end

  def add(sid, uid, user, ip_address, user_agent)
    #log("Add session " + sid);
    sessionState = HttpSessionState.new(sid);
    sessionState.Items["user"] = user;
    sessionState.Items["uid"] = uid;
    sessionState.Items["ip_address"] = ip_address;
    sessionState.Items["user_agent"] = user_agent;
    @items.store(sid, sessionState);
    return sessionState;
  end

  # Remove invalid HttpSessionState objects from memory
  def removeExpired()
    now = DateTime.now;
    @items.each do |sid, sessionState|
      if sessionState.Timeout < now
        #log("Removing expired session " + sid);
        @items.delete(sid);
      end
    end
  end

  def exists(sid)
    return @items.has_key?(sid);
  end

  def get(sid)
    return @items[sid];
  end
end

class HttpSessionState
  @@SessionDuration = Rational(20 * 60, 86400); # 20min
  @@SlidingExpiration = true;

  attr_reader     :Timeout;
  attr_accessor   :Items;

  def initialize(sid)
    @SessionID = sid;
    @Items = Hash.new;
    self.updateLastRequest();
  end

  def updateLastRequest()
    @LastRequest = DateTime.now;
    if (@@SlidingExpiration)
      @Timeout = @LastRequest + @@SessionDuration;
    end
  end
end

class HttpSession < Rev::SSLSocket
  attr_reader   :user;
  attr_reader   :sid;
  attr_reader   :ssl;
  attr_accessor :data;
  attr_accessor :auth;
  @@logfd = nil;

  def initialize(socket, root, options = {})
    @root        = root;
    @sck_data    = "";
    @length      = nil;
    @ssl         = options[:ssl.to_s] || false;
    @certificate = options[:certificate.to_s];
    @key         = options[:key.to_s];
    @user        = nil;
    @sid         = nil;
    # fix for quick connect disconnect
    begin
      super(socket);
    rescue
      def attach(loop)
      end
    end
    sync         = true;
  end

  def remote_address()
    @_io.remote_address();
  end

  def local_address()
    @_io.local_address();
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
    extend SocketDirtyFix;
  end

  def on_close()
    log("disconnected");
  end

  def on_read(data)
    #debug("HTTP data\n" + data);
    @sck_data << data;
    while(@sck_data.bytesize != 0)
      # Decode header
      if(@length == nil)
        header, body = @sck_data.split("\r\n\r\n", 2);
        # Header incomplete
        break if(body == nil);

        @req = HttpRequest.parse(header);
        if(@req == nil)
          close();
          return;
        end
        debug(@req.uri);
        length = @req.options["Content-Length"];
        if(length == nil)
          @length = 0;
        else
          @length = length.to_i();
        end
        @sck_data = body;
      end

      # Body incomplete
      break if(@sck_data.bytesize() < @length);

      @req.addData(@sck_data.slice!(0 .. @length - 1)) if(@length != 0);
      log(@req);
      m_auth    = nil;
      m_request = nil;

      if(@req.uri.path == nil)
        # Authentification error
        rsp = HttpResponse.generate500(@req)
        write(rsp.to_s);
        @length = nil;
        next
      end
      uri  = @req.uri.path.split("/");
      uri.delete_if {|n| n == "" };

      nodes = @root.scan(uri);

      depth = nodes.size();
      # find auth methode
      depth.downto(0) { |i|
        if(nodes[i].respond_to?(:on_auth));
          m_auth = nodes[i].method(:on_auth)
          break i;
        end
      }
      v = @req.options["Authorization"];

      if(m_auth != nil)
        pass = nil;
        if(v)
          method, code = v.split(" ", 2);

          if(method == "Basic" && code != nil)
            @user, pass = code.unpack("m").first.split(":", 2);
            pass ||= "";
          end
        else
          @user = "unknown";
        end
        @sid = "";

        @auth = m_auth.call(self, @req, @user, pass) if(@user);
      end

      if(m_auth != nil && @auth == nil)
        # Authentification error
        rsp = HttpResponse.generate401(@req)
        write(rsp.to_s);
        @length = nil;
        next
      end

      # Find ressource data
      pos = depth.downto(0) { |i|
        if(nodes[i].respond_to?(:on_request));
          m_request = nodes[i].method(:on_request)
          break i;
        end
      }
      if(m_request == nil)
        # No ressource found
        rsp = HttpResponse.generate404(@req)
        write(rsp.to_s);
        next;
      end

      # Generate prefix and remaining fields
      prefix     = "/";
      prefix    += uri[0..pos-1].join("/") if(pos != 0);
      remaining  = nil
      remaining  = uri[pos..-1].join("/")  if(pos != uri.size);

      @req.remaining = remaining;
      @req.prefix    = prefix;

      m_request.call(self, @req);
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

    def self.on_auth(s, req, user, pass)
      begin
        @authBlock.call(s, req, user, pass, *@authArgs);
      rescue => e
        error("on auth : #{e}")
      end
    end
  end

  def addRequest(*args, &block)
    @requestArgs   = args;
    @requestBlock  = block;

    def self.on_request(s, req)
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
        node.child.merge!(n.child[v].child) if(e != nil);
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

  def to_s(depth = 1)
    buf = ""
    @child.each { |name, node|
      buf << " " * depth;
      buf << name + "\n";
      buf << node.to_s(depth + 1)
    }
    buf
  end
end

# Map file directory on http directory
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
    super();
  end

  def on_request(s, req)
    path = @dir + "/";
    path += req.remaining if(req.remaining != nil)

    begin
      st   = File.stat(path);
      if(st.directory? == true)
        # Try index.html
        path += "/index.html"
        st   = File.stat(path);
      end
      resolved_path = File.dirname(path);
      raise "try to access files outside jukebox root path" if( not resolved_path.start_with?(@dir) )
    rescue Errno::ENOENT
      rsp = HttpResponse.generate404(req);
      s.write(rsp.to_s);
      return;
    rescue  => e
      rsp = HttpResponse.generate403(req);
      s.write(rsp.to_s);
      return;
    end
    ext  = path.scan(/.*\.(.*)/).first;
    contentType = nil;
    contentType = ContentTypeTab[ext.first]  if(ext);
    contentType = ContentTypeTab[nil]        if(contentType == nil);
    rsp  = HttpResponse.new(req.proto, 200, "OK", {"Set-Cookie" => req.options["Set-Cookie"]} );
    #debug(path);
    data = File.read(path)
    rsp.setData(data, contentType);
    s.write(rsp.to_s);
  end
end

class Cookie
  def initialize(values, domain, path, expire, secure, httpOnly)
    @values = values;
    @domain = domain;
    @path = path;
    @expire = expire;
    @secure = secure;
    @httpOnly = httpOnly;
  end

  def to_s()
    return "" if @values.length == 0
    ret = [];
    @values.each{ |key, value|
      ret << "#{key}=#{value}"
    }
    ret << "Domain=#{@domain}" if(@domain)
    ret << "Path=#{@path}" if(@path)
    ret << "Expires=#{@expire.strftime("%a, %d %b %Y %H:%M:%S GMT")}" if(@expire)
    ret << "Secure" if(@secure)
    ret << "HttpOnly" if(@httpOnly)
    ret.join("; ");
  end

end

class HttpRootNode
  def initialize(node = {})
    @root = HttpNode.new();
    node.each { |path, node|
      addNode(path, node)
    }
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

  def to_s()
    buf = "HTTP root tree\n"
    buf << @root.to_s();
    buf
  end
end

class HttpServer < Rev::TCPServer
  attr_reader :root

  @@logfd = nil;

  # options
  #  * port (default 8080)
  #  * ssl (default false)
  #  * key (default nil, only use with ssl)
  #  * certificate (default nil, only use with ssl)
  def initialize(root = nil, options = {})
    port = options[:port.to_s] || 8080;
    host = options[:host.to_s] || nil;

    @root   = root
    @root ||= HttpRootNode.new();

    log("starting http server")
    super(host, port, HttpSession, @root, options);
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
