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
    rep = HttpResponse.new(req.proto, 200, "OK");

    res = "";
    #debug("IN: " + req.data);
    if(ch == nil)
      res = JsonManager.create_message(JsonManager::MSG_LVL_WARNING,
                                       "Unknown channel #{s.user}");
    else
      res = parse(req.data, ch, s.user, s.sid);
    end
    rep.setData(res, "application/json");
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
    #debug("OUT: " + str);
    str;
  end

  private

  def parse(req, ch, user, sid)
    resp = { :timestamp => Time.now.to_i() };
    if(req == nil)
        JsonManager.add_message(resp, MSG_LVL_ERROR, "JSON request not found", "Json request not found");
    else
      begin
        json      = JSON.parse(req);
        timestamp = json.delete("timestamp") || 0;
        json.each { |type, value|
          case(type)
          when "search"
            parse_search(resp, value);
          when "action"
            parse_action(resp, ch, user, value, sid);
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
    #debug("OUT: " + str);
    str;
  end

  def forward_action(resp, req, ch, user, sid)
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
    when "get_user_informations"
      result = @library.get_user_informations( sid )
      if( result != nil )
        resp [:account] = {
          :nickname => user,
          :token   => result[0],
          :home	   => result[1],
          :sid	   => sid,
          :user_agent	   => result[2],
          :ip	   => result[3]

        };
      else
        JsonManager.add_message(resp, MSG_LVL_ERROR, nil, "Cannot retrieve personnal informations for user :#{user}, token :#{sid}");
      end
    when "change_user_password"
      result = @library.change_user_password( user, sid, req["nickname"], req["old_password"], req["new_password"], req["new_password2"] )
      if( result )
        JsonManager.add_message(resp, MSG_LVL_INFO, nil, "#{user}'s password successfully changed");
      else
        JsonManager.add_message(resp, MSG_LVL_ERROR, nil, "You cannot change #{user}'s password");
      end
    when "create_user"
      res=nil
      res=@library.create_new_user( req["nickname"], req["password"], 0 ) if(req["nickname"] != "")
      if(res==nil)
        JsonManager.add_message(resp, MSG_LVL_ERROR, nil, "user #{req["nickname"]} not created (already exists or invalid)");
      else
        resp[:account_created]={}
        JsonManager.add_message(resp, MSG_LVL_INFO, nil, "user #{req["nickname"]} created (but not validated)");
        JsonManager.add_message(resp, MSG_LVL_INFO, nil, "Wait the administrator validation");
      end
    when "validate_user"
      @library.validate_user( req["nickname"] )
      JsonManager.add_message(resp, MSG_LVL_INFO, nil, "user #{req["nickname"]} validated");
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

  def parse_action(resp, ch, user, req, sid)
    begin
      if( req.kind_of?(Array) )
        req.each { |currentAction|
          # Warning multi action should merge responses
          forward_action(resp, currentAction, ch, user, sid );
        }
      else
        forward_action(resp, req, ch, user, sid);
      end
    rescue => e
      error("Error when parsing action query #{e.backtrace}: #{e.message} (#{e.class})");
      JsonManager.add_message(resp, MSG_LVL_ERROR, nil, "Error when parsing action query");
    end
  end

  def parse_search(resp, req)
    begin

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
    rescue => e
      error("Error when parsing search query  #{e.backtrace}: #{e.message} (#{e.class})");
      JsonManager.add_message(resp, MSG_LVL_ERROR, nil, "Error when parsing search query");
      resp;
    end
  end
end

