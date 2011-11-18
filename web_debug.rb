require 'http.rb'

class DebugPage < HttpNode
  def on_request(s, req)
    obj_kind = {}
    GC.start
    ObjectSpace.each_object { |obj|
      obj_kind[obj.class] = [] if(obj_kind[obj.class] == nil)
      obj_kind[obj.class].push(obj);
    }
    rep = HttpResponse.new(req.proto, 200, "OK");
    page = "<html><head><title>status</title></head><body>";
    if(obj_kind[Connection])
      page << "<table>";
      page << "<tr><th>Peer</th><th>SSL</th><th>User</th><th>Song</th><th>Sock out queue</th><tr>";
      obj_kind[Connection].each { |c|
        meta = c.ch.meta();
        page << "<tr>"
        page << "<td>#{c.socket.remote_address.inspect_sockaddr}</td>"
        page << "<td>#{c.socket.ssl == true}</td>"
        page << "<td>#{c.socket.user}</td>"
        page << "<td>#{meta.title.gsub("\'", " ")} - #{meta.artist.gsub("\'", " ")} - #{meta.album.gsub("\'", " ")}</td>"
        page << "<td>#{c.socket.output_buffer_size}</td>"
        page << "<tr>";
      }
    end

    if(obj_kind[EncodingThread])
      page << "<table>";
      page << "<tr><th>PID</th><th>File</th><th>Song</th><th>Bitrate</th></tr>";
      obj_kind[EncodingThread].each { |e|
        page << "<tr>"
        page << "<td>#{e.pid}</td>"
        page << "<td>#{e.file[1]}</td>"
        page << "<td>#{meta.title.gsub("\'", " ")} - #{meta.artist.gsub("\'", " ")} - #{meta.album.gsub("\'", " ")}</td>"
        page << "<td>#{e.file}</td>"
        page << "<td>#{e.bitrate}</td>"
        page << "<tr>";
      }
      page << "</table>";
    end
    page << "</body></head>";
    rep.setData(page);

    s.write(rep.to_s);  
  end
end
