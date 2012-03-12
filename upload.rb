#!/usr/bin/env ruby

require 'json'
require 'rev'
require 'http.rb'
require 'display.rb'
require 'uri'

class UploadManager < HttpNode
  def initialize(conf)
    super();
    # Defaults server values if config file is undefined
    @max_request_size_in_bytes = 21* 1024 * 1024;
    @max_file_size_in_bytes = 20 * 1024 * 1024; # 20M
    @allowed_extensions = [ 'mp3' ];
    @dst_folder = "uploads/"

    # Initialize uploder from config file if exists
    @max_file_size_in_bytes = conf['max_file_size_in_bytes'] if( conf && conf['max_file_size_in_bytes'] )
    @allowed_extensions = conf['allowed_extensions'] if( conf && conf['allowed_extensions'] )
  end

  def on_request(s, req)
    # TODO separate upload by users : must create a subFolder By users
    warning('Upload : File to upload request received : '+ URI.unescape(req.options['X-File-Name']) + " filesize : " + req.options['Content-Length']);
    
    #Creates upload directory if doesn't exists
    if ( not File.directory?(@dst_folder))
      Dir.mkdir(@dst_folder);
    end
    if ( not File.directory?(File.join(@dst_folder,s.user)))
      Dir.mkdir(File.join(@dst_folder,s.user));
    end

    if( req.to_s.length > @max_request_size_in_bytes )
      rep = HttpResponse.new(req.proto, 200, "Error",
                             "Content-Type" => "application/json");
      res = '{ "error": "HttpRequest too big. ' + req.to_s.length + ' > #{@max_request_size_in_bytes}" , success: false}';
      rep.setData(res);
      s.write(rep.to_s);
      return;
    end

    # Extensions tests before uploading the file
    fileExtentionValidated = false;
    @allowed_extensions.each { |ext|
      if( ext == File.extname(URI.unescape(req.options['X-File-Name'])) )
        fileExtentionValidated = true;
      end
    }
    if( not fileExtentionValidated )
      error("Unauthorized file extension "+File.extname(URI.unescape(req.options['X-File-Name']))+". Authorized extensions are #{@allowed_extensions}");
      rep = HttpResponse.new(req.proto, 200, "Error",
                             "Content-Type" => "application/json");
      res = '{ error: "Unauthorized file extension \'' + URI.unescape(File.extname(req.options['X-File-Name'])) + '\'. Authorized extensions are #{@allowed_extensions}", success: false}';
      rep.setData(res);
      s.write(rep.to_s);
      return;
    end

    # FileSize limitations
    if( req.options['Content-Length'].to_i > @max_file_size_in_bytes )
      rep = HttpResponse.new(req.proto, 200, "Error",
                             "Content-Type" => "application/json");
      res = '{ error: "File too big. ' + req.options['Content-Length'] + ' > #{@max_file_size_in_bytes}" , success: false}';
      rep.setData(res);
      s.write(rep.to_s);
      return;
    end

    #Checks if the file already exists
    if( File.exists?(File.join(@dst_folder, s.user, URI.unescape(req.options['X-File-Name']))) )
      error("File " + URI.unescape(req.options['X-File-Name']) + " already uploaded. Upload canceled.");
      rep = HttpResponse.new(req.proto, 200, "Error",
                             "Content-Type" => "application/json");
      res = '{ error: "' + URI.unescape(req.options['X-File-Name']) + ' already exists. upload canceled.", success: false}';
      rep.setData(res);
      s.write(rep.to_s);
      return;
    end

    #All is ok we can begin to save file on disk
    begin
      File.open( File.join(@dst_folder,s.user, URI.unescape(req.options['X-File-Name'])), 'w') {|f| 
        f.write(req.data);
      }
      rep = HttpResponse.new(req.proto, 200, "OK",
                             "Content-Type" => "application/json");
      res = '{ success: true}';
    rescue Exception=>e
      error(e);
      rep = HttpResponse.new(req.proto, 200, "Error",
                           "Content-Type" => "application/json");
      res = '{ error: "Could not save uploaded file.", success: false}';
    ensure
      rep.setData(res);
      s.write(rep.to_s);
    end
  end
  
  def self.getUploadedFiles(uploadDirectory, user)
    files = [];
    Dir.foreach(File.join(uploadDirectory, user)) do |current_file| 
      if File.file?(File.join(uploadDirectory, user, current_file))
        id3info = Id3.decode(File.join(uploadDirectory, user, current_file));
        file = {
          :filename   => current_file,
          :date_upload => File.atime(File.join(uploadDirectory, user, current_file)),
          :filesize => current_file.size,
          :artist => id3info.artist,
          :album => id3info.album,
          :title => id3info.title,
          :year => id3info.date,
          :track => id3info.track,
          :genre => id3info.genre
        };
        files.push(file);
      end
    end
    files;
  end
end
