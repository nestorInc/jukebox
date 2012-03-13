#!/usr/bin/env ruby

require 'json'
require 'rev'
require 'http.rb'
require 'display.rb'
require 'upload.rb'
require 'fileutils'

class JsonManager < HttpNode
  MSG_LVL_DEBUG   = 1
  MSG_LVL_INFO    = 2
  MSG_LVL_WARNING = 3
  MSG_LVL_ERROR   = 4
  MSG_LVL_FATAL   = 5

  def initialize(list, library, conf_upload, conf_encode)
    @list     = list;
    @library  = library;
    @upload_dir = conf_upload["dst_folder"];
    @source_dir = conf_encode["source_dir"];
    super();
  end

  def on_request(s, req)
    ch  = @list[s.user];
    rep = HttpResponse.new(req.proto, 200, "OK",
                           "Content-Type" => "application/json");
    res = "";
    debug(req.data);
    if(ch == nil)
      res = create_message(JsonManager::MSG_LVL_WARNING,
                                "Unknown channel #{s.user}");
    else
      res = parse(req.data, ch, s.user);
    end
    rep.setData(res);
    s.write(rep.to_s);
  end

  private
  def create_message(lvl, code = nil, msg)
    resp = {};
    msg = {
      :level   => lvl,
      :message => msg
    };
    msg[:code] = code if(code);

    resp[:messages] = [ msg ];

    str = JSON.generate(resp);
    debug(str);
    str;
  end

  def parse(req, ch, user)
    resp = { :timestamp => Time.now.to_i() };
    if(req == nil)
        add_message(resp, MSG_LVL_ERROR, "JSON request not found", "Json request not found");      
    else
      begin
        json      = JSON.parse(req);
        timestamp = json.delete("timestamp") || 0;
        json.each { |type, value|
          case(type)
          when "search"
            parse_search(resp, value);
          when "action"
            parse_action(resp, ch, user, value);
          else
            add_message(resp, MSG_LVL_ERROR, "unknown command #{type}", "Unknown command #{type}");
          end
        }
        # refresh
        add_channel_infos(resp, ch);
        add_current_song(resp, ch);
        if(timestamp <= ch.timestamp)
          add_play_queue(resp, ch);
        end
      rescue JSON::ParserError => e
        add_message(resp, MSG_LVL_ERROR, "fail to parse request", "Exception when parsing json request, #{e}");
        error("Exception when parsing json request, #{e}");
      end
    end
    str = JSON.generate(resp);
    debug(str);
    str;
  end
  
  def add_message(resp, lvl, code, msg)
    msg = {
      :level   => lvl,
      :message => msg
    };
    msg[:code] = code if(code);

    resp[:messages] ||= [];
    resp[:messages].push(msg);
  end

  def add_channel_infos(resp, ch)
    resp[:channel_infos] = {
      :listener_count => ch.getConnected()
    };
  end

  def add_current_song(resp, ch)
    song    = ch.meta;
    elapsed = ch.song_pos();
    resp[:current_song] = {
      :mid          => song.mid,
      :title        => song.title,
      :artist       => song.artist,
      :album        => song.album,
      :total_time   => song.duration,
      :elapsed_time => elapsed
    };
  end

  def add_play_queue(resp, ch)
    queue = ch.mids[1..-1];
    if(queue.size() != 0)
      queue = @library.get_file(*queue).reject(&:nil?).map { |song|
        {
          :mid       => song.mid,
          :artist    => song.artist,
          :title     => song.title,
          :album     => song.album,
          :duration  => song.duration
        }
      }
    end

    if(queue)
      resp[:play_queue] = {
        :songs => queue
      }
    end
  end

  def forward_action(resp, req, ch, user)
      if( nil == resp )
        resp = { :timestamp => Time.now.to_i() };
      else
        resp[:timestamp] = Time.now.to_i();
      end
      case(req["name"])
      when "next"
        ch.next();
      when "previous"
        ch.previous();
      when "add_to_play_queue"
        ch.add_song(req["play_queue_index"], req["mid"])
      when "add_search_to_play_queue" 
        result = @library.secure_request("mid",
                                         CGI::unescape(req["search_value"]),
                                         req["search_comparison"],
                                         req["search_field"],
                                         req["order_by"],
                                         req["order_by_way"],
                                         req["first_result"],
                                         req["result_count"]);
        if(req["play_queue_position"]  == "head")
          i = 0;
        else
          i = nil;
        end
        ch.add_song(i, result);
      when "remove_from_play_queue"
        ch.del_song(req["play_queue_index"]);
      when "move_in_play_queue"
        ch.move_song(req["play_queue_index"], req["new_play_queue_index"]);
      when "get_uploaded_files"
        #TODO only if https sessions or send a 403
        files = UploadManager.getUploadedFiles(@upload_dir, user);
        resp [:uploaded_files] = {
          :nb_files     	=> files.size,
          :files			=> files
        };
      when "update_uploaded_file"
        #TODO each field check if it's well formed

        file_path= File.join(@upload_dir, user, req["file_name"]);
        if File.file?(file_path)
          if(nil == req["artist"] || nil == req["album"] || nil == req["title"] || nil ==  req["year"] )
            error("Wrong id3 informations #{req["file_name"]}");
            action_response = {
            :name              => "validate_uploaded_file",
            :return            => "error",
            :message           => "Wrong id3 informations to update for #{req["file_name"]}"
          };
            resp [:uploaded_files] = {
            :action_response        => action_response
          };
            return resp;
          end
          

          cmd = "id3v2 --artist '#{req["artist"]}' '#{file_path}'";
          value = `#{cmd}`;
          cmd = "id3v2 --album '#{req["album"]}' '#{file_path}'";
          value = `#{cmd}`;
          cmd = "id3v2 --song '#{req["title"]}' '#{file_path}'";
          value = `#{cmd}`;
          cmd = "id3v2 --year #{req['year']} '#{file_path}'";
          value = `#{cmd}`;
          cmd = "id3v2 --track '#{req["track"]}' '#{file_path}'";
          value = `#{cmd}`;
          cmd = "id3v2 --genre '#{req["genre"]}' '#{file_path}'";
          value = `#{cmd}`;
          action_response = {
             :name              => "update_uploaded_file",
             :return            => "success",
             :message           => "Id3 informations for #{req["file_name"]} successfuly updated"
          };
          resp [:uploaded_files] = {
             :action_response        => action_response
          };
        else
            action_response = {
               :name              => "update_uploaded_file",
               :return            => "error",
               :message           => "File not found"
            };
            resp [:uploaded_files] = {
               :action_response        => action_response
            };
        end
        
      when "validate_uploaded_file"
        file_path= File.join(@upload_dir, user, req["file_name"]);

        id3info = Id3.decode(file_path);
        if(nil == id3info.artist || nil == id3info.album || nil == id3info.title || nil ==  id3info.date )
          error("Wrong id3 informations #{req["file_name"]}");
          action_response = {
            :name              => "validate_uploaded_file",
            :return            => "error",
            :message           => "Wrong id3 informations for  #{req["file_name"]}"
          };
          resp [:uploaded_files] = {
             :action_response        => action_response
          };
          return resp;
        end

        if File.file?(file_path)
          begin
            title = "#{id3info.artist} - #{id3info.album} - #{id3info.title}.mp3";
            album_folder = "#{id3info.date} - #{id3info.album}";
            dst_folder = File.join(@source_dir, id3info.artist);
          rescue Exception=>e
            error(e);
            action_response = {
               :name              => "validate_uploaded_file",
               :return            => "error",
               :message           => "Song #{req["file_name"]} : id3 informations not well formed. #{e}"
            };
            resp [:uploaded_files] = {
               :action_reponse        => action_response
            };
            return resp;
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
              resp [:uploaded_files] = {
                :action_reponse        => action_response
              };

            else
              action_response = {
                :name              => "validate_uploaded_file",
                :return            => "error",
                :message           => "Song #{req["file_name"]} already in library, could not send it to encoding."
              };
              resp [:uploaded_files] = {
                :action_reponse        => action_response
              };
              return resp;
            end
          rescue Exception=>e
            error(e);
            add_message(resp, MSG_LVL_ERROR, nil, "Could not move file #{req["file_name"]}");
            action_response = {
               :name              => "validate_uploaded_file",
               :return            => "error",
               :message           => "Could not move the file #{req["file_name"]}"
            };
            resp [:uploaded_files] = {
               :action_reponse        => action_response
            };
            return resp;
          end
        else #!File
            add_message(resp, MSG_LVL_ERROR, nil, "Validation abort. File not found : #{req["file_name"]}.");
            action_response = {
               :name              => "validate_uploaded_file",
               :return            => "error",
               :message           => "Validation abort. File not found : #{req["file_name"]}."
            };
            resp [:uploaded_files] = {
               :action_response        => action_response
            };
            return resp;
        end

      when "delete_uploaded_file"
        file_path= File.join(@upload_dir, user, req["file_name"]);
        if File.file?(file_path)
          begin
            File.delete(file_path);
            add_message(resp, MSG_LVL_INFO, nil, "File : #{req["file_name"]}, successfuly deleted.");
            action_response = {
               :name              => "delete_uploaded_file",
               :return            => "success"
            };
            resp [:uploaded_files] = {
               :action_response        => action_response
            };
          rescue Exception=>e
            error(e);
            add_message(resp, MSG_LVL_ERROR, nil, "Could not remove file #{req["file_name"]}");
            action_response = {
               :name              => "delete_uploaded_file",
               :return            => "error",
               :message           => "Could not remove file #{req["file_name"]}"
            };
            resp [:uploaded_files] = {
               :action_reponse        => action_response
            };
          end
        else 
            add_message(resp, MSG_LVL_ERROR, nil, "Deletion abort. File not found : #{req["file_name"]}.");
            action_response = {
               :name              => "delete_uploaded_file",
               :return            => "error",
               :message           => "Deletion abort. File not found : #{req["file_name"]}."
            };
            resp [:uploaded_files] = {
               :action_response        => action_response
            };
        end
      when "select_plugin"
        ch.set_plugin(req["plugin_name"]);
      else
        error("Unknown action #{req["name"]}", true, $error_file);
        add_message(resp, MSG_LVL_ERROR, nil, "unknown action #{req["name"]}");
      end
  end

  def parse_action(resp, ch, user, req)
    if( req.kind_of?(Array) )
      req.each { |currentAction| 
        # Warning multi action should merge responses
        forward_action(resp, currentAction, ch, user );
      }
    else
      forward_action(resp, req, ch, user);
    end
  end

  def parse_search(resp, req)
    result = @library.secure_request(req["select_fields"],
                                     CGI::unescapeHTML(req["search_value"]),
                                     req["search_comparison"],
                                     req["search_field"],
                                     req["order_by"],
                                     req["order_by_way"],
                                     req["first_result"],
                                     req["result_count"]);

    songs = result.map { |song|
      { 
        :mid      => song.mid,
        :artist   => song.artist,
        :title    => song.title,
        :album    => song.album,
        :duration => song.duration
      }
    }
    resp [:search_results] = {
      :identifier     => req["identifier"],
      :select         => req["select"],
      :select_fields  => req["select_fields"],
      :search_value	  => CGI::unescapeHTML(req["search_value"]),
      :search_comparison  => req["search_comparison"],
      :search_field   => req["search_field"],
      :result_count   => req["result_count"],
      :order_by       => req["order_by"],
      :order_by_way   => req["order_by_way"],
      :first_result   => req["first_result"],
      :total_results  => @library.get_total(req["search_field"],
                                       req["search_comparison"],
                                           req["search_value"]),
      :results        => songs
    };
  end
end

