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
    @upload_dir = conf_upload  && conf_upload["dst_folder"] || "uploads";
    @source_dir = conf_encode  && conf_encode["source_dir"] || "../../musik/sorted/";
    super();
  end

  def on_request(s, req)
    ch  = @list[s.user];
    rep = HttpResponse.new(req.proto, 200, "OK",
                           "Content-Type" => "application/json");
    res = "";
    debug(req.data);
    if(ch == nil)
      res = JsonManager.create_message(JsonManager::MSG_LVL_WARNING,
                                       "Unknown channel #{s.user}");
    else
      res = parse(req.data, ch, s.user);
    end
    rep.setData(res);
    s.write(rep.to_s);
  end

  def JsonManager.add_message(resp, lvl, code, msg)
    msg = {
      :level   => lvl,
      :message => msg
    };
    msg[:code] = code if(code);

    resp[:messages] ||= [];
    resp[:messages].push(msg);
  end


  def JsonManager.create_message(lvl, code = nil, msg)
    resp = {};

    JsonManager.add_message(resp, lvl, code, msg);

    str = JSON.generate(resp);
    debug(str);
    str;
  end

  private

  def parse(req, ch, user)
    resp = { :timestamp => Time.now.to_i() };
    if(req == nil)
        JsonManager.add_message(resp, MSG_LVL_ERROR, "JSON request not found", "Json request not found");      
    else
      begin
        json      = JSON.parse(req);
        timestamp = json.delete("timestamp") || 0;
        json.each { |type, value|
          case(type)
          when "token"
            resp["token"] = @library.create_token(user, rand(99999999999).to_s);
          when "search"
            parse_search(resp, value);
          when "action"
            parse_action(resp, ch, user, value);
          else
            JsonManager.add_message(resp, MSG_LVL_ERROR, "unknown command #{type}", "Unknown command #{type}");
          end
        }
        # refresh
        resp[:channel_infos] = ch.to_client();
        resp[:current_song]  = ch.getCurrentSongInfo();
        if(timestamp <= ch.queue.timestamp)
          resp[:play_queue] = ch.queue.to_client(@library);
        end
      rescue JSON::ParserError => e
        JsonManager.add_message(resp, MSG_LVL_ERROR, "fail to parse request", "Exception when parsing json request, #{e}");
        error("Exception when parsing json request, #{e}");
      end
    end
    str = JSON.generate(resp);
    debug(str);
    str;
  end
  
  def forward_action(resp, req, ch, user)
    resp ||= {};
    resp[:timestamp] = Time.now.to_i();
    case(req["name"])
    when "next"
      ch.next();
    when "previous"
      ch.previous();
    when "add_to_play_queue"
      ch.queue.add(req["play_queue_index"], req["mid"])
    when "shuffle_play_queue"
      ch.queue.shuffle();
    when "add_search_to_play_queue" 
      result = @library.secure_request("mid",
                                       CGI::unescape(req["search_value"]),
                                       req["search_comparison"],
                                       req["search_field"],
                                       req["order_by"],
                                       req["first_result"],
                                       req["result_count"]);
      if(req["play_queue_position"]  == "head")
        ch.queue.add(0, result);
      elsif( req["play_queue_position"]  == "tail" )
        ch.queue.add(nil, result);
      else # randomly
        result.each { |song|
           ch.queue.add(rand(ch.queue.list.length-1) , song);
        }
      end

    when "remove_from_play_queue"
      ch.queue.del(req["play_queue_index"]);
    when "move_in_play_queue"
      ch.queue.move(req["play_queue_index"], req["new_play_queue_index"]);
    when "get_uploaded_files"
      #TODO only if https sessions or send a 403
      files = UploadManager.getUploadedFiles(@upload_dir, user);
      resp [:uploaded_files] = {
        :nb_files     	=> files.size,
        :files			=> files
      };
    when "update_uploaded_file"
      action_response = UploadManager.updateUploadedFiles(@upload_dir, user, 
                                                          req, resp);
      resp [:uploaded_files] = {
        :action_response        => action_response
      };
    when "validate_uploaded_file"
      action_response = UploadManager.validateUploadedFiles(@source_dir, @upload_dir, user, 
                                                            req, resp);
      resp [:uploaded_files] = {
        :action_response        => action_response
      };
    when "delete_uploaded_file"
      action_response = UploadManager.deleteUploadedFiles(@upload_dir, user, 
                                                          req, resp);
      resp [:uploaded_files] = {
        :action_response        => action_response
      };
    when "select_plugin"
      ch.set_plugin(req["plugin_name"]);
    else
      error("Unknown action #{req["name"]}", true, $error_file);
      JsonManager.add_message(resp, MSG_LVL_ERROR, nil, "Unknown action #{req["name"]}");
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
                                     req["first_result"],
                                     req["result_count"]);

    songs = result.map { |song|
      { 
        :mid      => song.mid,
        :artist   => song.artist,
        :title    => song.title,
        :album    => song.album,
        :track    => song.track,
        :genre    => song.genre,
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
      :first_result   => req["first_result"],
      :total_results  => @library.get_total(req["search_field"],
                                       req["search_comparison"],
                                           req["search_value"]),
      :results        => songs
    };
  end
end

