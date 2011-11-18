#!/usr/bin/env ruby

require 'json'
require 'rev'

require 'http.rb'
require 'display.rb'

class JsonManager < HttpNode
  MSG_LVL_DEBUG   = 1
  MSG_LVL_INFO    = 2
  MSG_LVL_WARNING = 3
  MSG_LVL_ERROR   = 4
  MSG_LVL_FATAL   = 5

  def initialize(list, library)
    @list     = list;
    @library  = library;

    super();
  end

  def on_request(s, req)
    ch  = @list[s.user];
    rep = HttpResponse.new(req.proto, 200, "OK",
                           "Content-Type" => "application/json");
    res = "";
    if(ch == nil)
      res = create_message(JsonManager::MSG_LVL_WARNING,
                                "Unknown channel #{s.user}");
    else
      query = CGI::unescape(req.data);
      argv = query.split(/&/).map { |v|
        v.split(/\=/);
      };
      argv = Hash[argv];
      res = parse(argv["query"], @library, ch);
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

  def parse(req, library, ch)
    resp = { :timestamp => Time.now.to_i() };
    if(req == nil)
        add_message(resp, MSG_LVL_ERROR, "JSON request not found");      
    else
      begin
        json      = JSON.parse(req);
        timestamp = json.delete("timestamp") || 0;
        json.each { |type, value|
          case(type)
          when "search"
            parse_search(resp, library, value);
          when "action"
            parse_action(resp, ch, value);
          else
            add_message(resp, MSG_LVL_ERROR, "unknown command #{type}");
            error("Unknown command #{type}", true, $error_file);
          end
        }
        # refresh
        add_channel_infos(resp, ch);
        if(timestamp <= ch.timestamp)
          add_current_song(resp, library, ch);
          add_play_queue(resp, library, ch);
        end
      rescue JSON::ParserError => e
        add_message(resp, MSG_LVL_ERROR, "fail to parse request");
        error("Exception when parsing json request, #{e}")
        debug(req);
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

  def add_current_song(resp, library, ch)
    mid    = ch.mids[ch.pos];
    song   = library.get_file(mid).first;
    resp[:current_song] = {
      :mid          => mid,
      :title        => song.title,
      :artist       => song.artist,
      :album        => song.album,
      :total_time   => 203,
      :elapsed_time => 70
    };
  end

  def add_play_queue(resp, library, ch)
    queue = library.get_file(*ch.mids[ch.pos+1..-1]).map { |song|
      {
        :mid       => song.mid,
        :artist    => song.artist,
        :title     => song.title,
        :album     => song.album,
        :duration  => 270
      }
    }

    if(queue)
      resp[:play_queue] = {
        :songs => queue
      }
    end
  end

  def parse_action(resp, ch, req)
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
      add_message(resp, MSG_LVL_ERROR, nil, "unknown action #{req["name"]}");
    end
  end

  def parse_search(resp, library, req)
    result = library.secure_request(req["search_value"],
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

