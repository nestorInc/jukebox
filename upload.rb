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
    @allowed_extensions = { '.mp3' => true };
    @dst_folder = "uploads/"

    # Initialize uploder from config file if exists
    @max_request_size_in_bytes = conf['max_request_size_in_bytes'] if( conf && conf['max_request_size_in_bytes'] );
    @max_file_size_in_bytes = conf['max_file_size_in_bytes'] if( conf && conf['max_file_size_in_bytes'] );
    conf['allowed_extensions'].each { |ext| @allowed_extensions[ext] = true; } if(conf && conf['allowed_extensions']);
    @dst_folder = conf['dst_folder'] if( conf && conf['dst_folder'] );
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
      res = '{ "error": "HttpRequest too big. #{req.to_s.length}  > #{@max_request_size_in_bytes}" , success: false}';
      rep.setData(res);
      s.write(rep.to_s);
      return;
    end

    # Extensions tests before uploading the file
    if(@allowed_extensions[File.extname(URI.unescape(req.options['X-File-Name'])).downcase()] != true)
      allowed_extensions_str = @allowed_extensions.keys.map{ |i|  "'" + i.to_s + "'" }.join(",")
      
      error("Unauthorized file extension "+File.extname(URI.unescape(req.options['X-File-Name']))+". Authorized extensions are #{allowed_extensions_str}");
      rep = HttpResponse.new(req.proto, 200, "Error",
                             "Content-Type" => "application/json");
      res = '{ error: "Unauthorized file extension \'' + URI.unescape(File.extname(req.options['X-File-Name'])) + '\'. Authorized extensions are ' + allowed_extensions_str +'", success: false}';
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
    begin
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
   rescue Exception=>e      
   end
   files;
  end

  def self.updateUploadedFiles(upload_dir, user, req, resp)
    error_message = nil;
    file_path= File.join(upload_dir, user, req["file_name"].force_encoding('UTF-8').encode(Encoding.locale_charmap));

    if File.file?(file_path)

      # Integrity check part
          if(nil == req["artist"] ||  "" == req["artist"])
            if( nil == error_message )
              error_message = '';
            end
            error_message += 'Could not set ID3 tag artist, this field should not be empty. ';
          end

          if( nil == req["album"] || "" == req["album"] )
            if( nil == error_message )
              error_message = '';
            end
            error_message += 'Could not set ID3 tag album, this field should not be empty. ';
          end

          if( nil == req["title"] || "" == req["title"] )
            if( nil == error_message )
              error_message = '';
            end
            error_message += 'Could not set ID3 tag title, this field should not be empty. ';
          end

          # Todo regexp to check if [0-9]+
          if( nil == req["year"] || "" == req["year"] || "" == req["year"] )
            if( nil == error_message )
              error_message = '';
            end
            error_message += 'Could not set ID3 tag year, this field must be an integer. ';
          end


          # Todo regexp to check if [0-9]+/?[0-9]*
          if( nil == req["track"] || "" == req["track"] )
            if( nil == error_message )
              error_message = '';
            end
            error_message += 'Could not set ID3 tag track, this field must be shaped as [Track number]/[Album nb tracks]. ';
          end

          # Todo regexp to check if [0-9]+
          if( nil == req["genre"] || "" == req["genre"] )
            if( nil == error_message )
              error_message = '';
            end
            error_message += 'Could not set ID3 tag genre, it must be an integer >=0 and <= 255.';
          end


          if( nil == error_message )
            begin
              cmd = "id3v2 --album \"#{req["album"].force_encoding('UTF-8').encode(Encoding.locale_charmap)}\" \"#{file_path}\"";
              value = `#{cmd}`;
              cmd = "id3v2 --song \"#{req["title"].force_encoding('UTF-8').encode(Encoding.locale_charmap)}\" \"#{file_path}\"";
              value = `#{cmd}`;
              cmd = "id3v2 --artist \"#{req["artist"].force_encoding('UTF-8').encode(Encoding.locale_charmap)}\" \"#{file_path}\"";
              value = `#{cmd}`;
              cmd = "id3v2 --year #{req['year']} \"#{file_path}\"";
              value = `#{cmd}`;
              cmd = "id3v2 --track \"#{req["track"]}\" \"#{file_path}\"";
              value = `#{cmd}`;
              cmd = "id3v2 --genre \"#{req["genre"]}\" \"#{file_path}\"";
              value = `#{cmd}`;
              action_response = {
                :name              => "update_uploaded_file",
                :return            => "success",
                :message           => "ID3 informations for #{req["file_name"]} successfully updated"
              };
              return action_response;
            rescue Exception=>e
              action_response = {
                :name              => "update_uploaded_file",
                :return            => "error",
                :message           => "No ID3 tag updated for #{req["file_name"]} : #{e}"
              };
              return action_response;
            end
          else
            action_response = {
               :name              => "update_uploaded_file",
               :return            => "error",
               :message           => "No ID3 tage updated! #{error_message}"
            };
            return action_response;
          end
        else
            action_response = {
               :name              => "update_uploaded_file",
               :return            => "error",
               :message           => "File not found"
            };
            return action_response;
        end
  end

  def self.validateUploadedFiles(source_dir,upload_dir, user, req, resp)
    error_message = nil;
    file_path= File.join(upload_dir, user,
                         req["file_name"].force_encoding('UTF-8').encode(Encoding.locale_charmap));

    begin
      id3info = Id3.decode(file_path);
    rescue Exception=>e
      error("Validation : Could not retrieve id3 informations #{file_path}, #{e}");
      action_response = {
        :name              => "validate_uploaded_file",
        :return            => "error",
        :message           => "Could not retrieve id3 informations for #{file_path}, #{e}"
      };
      return action_response;
    end

    # Integrity check part
    if(nil == id3info.artist or  "" == id3info.artist)
      if( nil == error_message )
        error_message = '';
      end
      error_message += 'ID3 tag Artist invalid, this field should not be empty. ';
    end
        
    if( nil == id3info.album or "" == id3info.album )
      if( nil == error_message )
        error_message = '';
      end
      error_message += 'ID3 tag Album invalid, this field should not be empty. ';
    end

    if( nil == id3info.title or "" == id3info.title )
      if( nil == error_message )
        error_message = '';
      end
      error_message += 'ID3 tag title invalid, this field should not be empty. ';
    end
        
    # Todo regexp to check if [0-9]+
    if( nil == id3info.date or "" == id3info.date or "" == id3info.date )
      if( nil == error_message )
        error_message = '';
      end
      error_message += 'Id3 tag Year invalid, this field must be an integer. ';
    end
    
    # Todo regexp to check if [0-9]+/?[0-9]*
    if( nil == id3info.track or "" == id3info.track )
      if( nil == error_message )
        error_message = '';
      end
      error_message += 'Id3 tag track is invalid, this field must be shaped as [Track number]/[Album nb tracks]. ';
    end

    # Todo regexp to check if [0-9]+
    if( nil == id3info.genre or "" == id3info.genre )
      if( nil == error_message )
        error_message = '';
      end
      error_message += 'Could not set ID3 tag genre, it must be an integer >=0 and <= 255.';
    end
    
    
    if( nil != error_message )
      error("Wrong id3 informations #{req["file_name"]}");
      action_response = {
        :name        => "validate_uploaded_file",
        :return      => "error",
        :message     => "Could not validate #{req["file_name"]}, wrong id3 informations. #{error_message}"
      };
      return action_response;
    end
    if( File.file?(file_path)  )
      begin
        trackStr = "#{id3info.track}";
        if( trackStr.include?("/") ) 
          track = trackStr.split("/")[0];
        else
          track = trackStr;
        end

        title = "#{id3info.artist} - #{id3info.album} - #{track} - #{id3info.title}.mp3";
        #filename is limited to 255 by the filesystem
        if(title.length > 255 )
          title = "#{id3info.title}.mp3"
        end
        album_folder = "#{id3info.date} - #{id3info.album}";
        dst_folder = File.join(source_dir, id3info.artist);
      rescue Exception=>e
        error(e);
        action_response = {
          :name      => "validate_uploaded_file",
          :return    => "error",
          :message   => "Song #{req["file_name"]} : id3 informations not well formed. #{e}"
        };
        return action_response;
      end

      begin
        if not File.directory?(dst_folder)
          warning("create " + dst_folder);
          Dir.mkdir(dst_folder);
        end
        dst_folder = File.join(dst_folder, id3info.album);
        if not File.directory?(dst_folder)
          warning("create " + dst_folder);
          Dir.mkdir(dst_folder);
        end
      rescue Exception=>e
      end

      begin
        if not File.file?(File.join(dst_folder,title))
          FileUtils.mv(file_path, File.join(dst_folder,title));
          warning( "File copied to " + File.join(dst_folder,title) );
          action_response = {
            :name              => "validate_uploaded_file",
            :return            => "success",
            :message           => "Song #{req["file_name"]} successfully sent for encoding."
          };
          return action_response;
        else
          action_response = {
            :name              => "validate_uploaded_file",
            :return            => "error",
            :message           => "Song #{req["file_name"]} already in library, could not send it to encoding."
          };
          return action_response;
        end
      rescue Exception=>e
        error(e);
        action_response = {
          :name              => "validate_uploaded_file",
          :return            => "error",
          :message           => "Could not move the file #{req["file_name"]}, #{e}"
        };
        return action_response;
      end
    else #!File
      action_response = {
        :name              => "validate_uploaded_file",
        :return            => "error",
        :message           => "Validation abort. File not found : #{req["file_name"]}."
      };
      return action_response;
    end
  end

  def self.deleteUploadedFiles(upload_dir, user, req, resp)
    file_path= File.join(upload_dir, user,
                         req["file_name"].force_encoding('UTF-8').encode(Encoding.locale_charmap));
    if File.file?(file_path)
      begin
        File.delete(file_path);
        action_response = {
          :name              => "delete_uploaded_file",
          :return            => "success"
        };
        return action_response;
      rescue Exception=>e
        error(e);
        action_response = {
          :name              => "delete_uploaded_file",
          :return            => "error",
          :message           => "Could not remove file #{req["file_name"]}, #{e}"
        };
        return action_response;
      end
    else 
      action_response = {
        :name       => "delete_uploaded_file",
        :return     => "error",
        :message    => "Deletion abort. File not found : #{req["file_name"]}, #{e}."
      };
      return action_response;
    end
  end
end
