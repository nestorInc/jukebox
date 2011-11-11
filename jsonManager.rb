#!/usr/bin/env ruby

require 'json'
require 'rev'

load 'display.rb'

class JsonManager
  MSG_LVL_DEBUG   = 1
  MSG_LVL_INFO    = 2
  MSG_LVL_WARNING = 3
  MSG_LVL_ERROR   = 4
  MSG_LVL_FATAL   = 5

  def self.create_message(lvl, code = nil, msg)
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

  def self.parse(req, library, ch)
    resp = { :timestamp => Time.now.to_i() };
    if(req == nil)
        self.add_message(resp, MSG_LVL_ERROR, "JSON request not found");      
    else
      begin
        json      = JSON.parse(req);
        timestamp = json.delete("timestamp") || 0;
        json.each { |type, value|
          case(type)
          when "search"
            self.parse_search(resp, library, value);
          when "action"
            self.parse_action(resp, ch, value);
          else
            self.add_message(resp, MSG_LVL_ERROR, "unknown command #{type}");
            error("Unknown command #{type}", true, $error_file);
          end
        }
        # refresh
        self.add_channel_infos(resp, ch);
        if(timestamp <= ch.timestamp)
          self.add_current_song(resp, library, ch);
          self.add_play_queue(resp, library, ch);
        end
      rescue JSON::ParserError => e
        self.add_message(resp, MSG_LVL_ERROR, "fail to parse request");
        error("Exception when parsing json request, #{e}")
        debug(req);
      end
    end

    str = JSON.generate(resp);
    debug(str);
    str;
  end
  
  private
  def self.add_message(resp, lvl, code, msg)
    msg = {
      :level   => lvl,
      :message => msg
    };
    msg[:code] = code if(code);

    resp[:messages] ||= [];
    resp[:messages].push(msg);
  end

  def self.add_channel_infos(resp, ch)
    resp[:channel_infos] = {
      :listener_count => ch.getConnected()
    };
  end

  def self.add_current_song(resp, library, ch)
    mid    = ch.mids[ch.pos];
    artist = library.get_artist(mid);
    title  = library.get_title(mid);
    resp[:current_song] = {
      :mid          => mid,
      :title        => title,
      :artist       => artist,
      :total_time   => 203,
      :elapsed_time => 70
    };
  end

  def self.add_play_queue(resp, library, ch)
    queue = ch.mids[ch.pos+1..-1].map { |mid|
      title  = library.get_title(mid).first;
      artist = library.get_artist(mid).first;
      {
        :mid       => mid,
        :artist    => artist,
        :title     => title,
        :duration  => 270
      }
    }

    if(queue)
      resp[:play_queue] = {
        :songs => queue
      }
    end
  end

  def self.parse_action(resp, ch, req)
    case(req["name"])
    when "next"
      ch.next();
    when "previous"
      ch.previous();
    when "add_to_play_queue"
      ch.playlist_add(req["play_queue_index"], req["mid"])
    when "remove_from_play_queue"
      ch.playlist_rem(req["play_queue_index"])
    when "move_in_play_queue"
      ch.playlist_move(req["play_queue_index"], req["new_play_queue_index"])
    when "select_plugin"
      # TODO handle exception, check file existence ...
      load "plugins/" + req["plugin_name"] + ".rb"
      ch.extend Plugin
      ch.plugin_name = req["plugin_name"]
      log("Loading #{req["plugin_name"]} plugin for songs selection")
    else
      error("Unknown action #{req["name"]}", true, $error_file);
      self.message(resp, MSG_LVL_ERROR, nil, "unknown action #{req["name"]}");
    end
  end

  def self.parse_search(resp, library, req)
    result = library.secure_request(req["search_value"],
                                    req["search_field"],
                                    req["order_by"],
                                    req["order_by_way"],
                                    req["first_result"],
                                    req["result_count"]);

    songs = result.map { |row|
      { 
        :mid      => row[2],
        :artist   => row[0],
        :title    => row[1],
        :duration => 270
      }
    }
    resp [:search_results] = {
      :order_by       => req["order_by"],
      :order_by_way   => req["order_by_way"],
      :first_result   => req["first_result"],
      :result_count   => result.size(),
      :total_results  => library.get_total(req["search_field"],
                                           req["search_value"]),
      :results        => songs
    };
  end
end

