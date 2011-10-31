#!/usr/bin/env ruby

require 'json'
require 'rev'

class JsonManager
  
  def initialize(library)
    @timestamp = 0;
    @currentMid = 0;
    @currentTitle = [];
    @currentArtist = [];
    @connected = 0;
    @refreshed = 1;
 
    @currentSong_s = ""; 
    @playQueue_s = "";
    @timestamp_s = "";
    @channelInfos_s = "";
    @listenerCount_s = "";
    @song_s = "";
    @searchResult_s = "";
  end

  # --- refresh functions ---

  def refresh_timestamp()
    @timestamp = Time.now().to_i();
  end

  def refresh_currentMid(currentMid)
    @currentMid = currentMid;
  end

  def refresh_connected(connected)
    @connected = connected;
  end
  
  def refresh_currentSong(currentArtist, currentTitle)
    @currentArtist = currentArtist;
    @currentTitle = currentTitle;
  end

  def refresh_nbUsers(nbUsers)
    @nbUsers = nbUsers;
  end

  def refresh_orderBy(orderBy)
    @orderBy = orderBy;
  end
 
  def refresh_orderByWay(orderByWay)
    @orderByWay = orderByWay;
  end

  def refresh_firstResult(firstResult)
    @firstResult = firstResult;
  end
 
  def refresh_resultCount(resultCount)
    @resultCount = resultCount;
  end

  def refresh_totalResult(totalResult)
    @totalResult = totalResult;
  end

  # --- string builders ---

  def build_orderBy_s()
    @orderBy_s = "\"order_by\":\"#{@orderBy}\"";
  end
 
  def build_orderByWay_s()
    @orderByWay_s = "\"order_by_way\":\"#{@orderByWay}\"";
  end

  def build_firstResult_s()
    @firstResult_s = "\"first_result\":#{@firstResult}" 
  end
  def build_resultCount_s()
    @resultCount_s = "\"result_count\":#{@resultCount}" 
  end
  def build_totalResult_s()
    @totalResult_s = "\"total_results\":#{@totalResult}" 
  end

  def build_timestamp_s()
    @timestamp_s = "\"timestamp\":#{@timestamp}";
  end

  def build_currentSong_s()
    @currentSong_s = "\"current_song\":{\"mid\":#{@currentMid},\"title\":\"#{@currentTitle[0]}\",\"artist\":\"#{@currentArtist[0]}\",\"total_time\":203,\"elapsed_time\":70}";
  end

  def build_channelInfos_s()
    build_listenerCount_s();
    @channelInfos_s = "\"channel_infos\":{#{@listenerCount_s}}";
  end

  def build_listenerCount_s()
    @listenerCount_s = "\"listener_count\":#{@connected}"
  end

  def build_songs_s(playlist, position, library)
    songs = ""
    playlistSize = playlist.size();
    for i in position+1..playlistSize-1
      title = library.get_title(playlist[i]);
      artist = library.get_artist(playlist[i]);
      if(i < playlistSize-1)
        songs = songs + "{\"mid\":#{playlist[i]},\"artist\":\"#{artist[0]}\",\"title\":\"#{title[0]}\",\"duration\":270}";
        if(i < (playlistSize-2))
          songs = songs + ",";
        end
      end
    end
    @songs_s = "\"songs\":[#{songs}]"
  end

  def build_requestSongs_s(resultTable)
    songs = "";
    size = 0;
    resultTable.each do |row|
      row[0].gsub!(/"/, '')
      row[1].gsub!(/"/, '')
      songs = songs + "{\"mid\":#{row[2]},\"artist\":\"#{row[0]}\",\"title\":\"#{row[1]}\",\"duration\":270}";
      if(size != resultTable.size()-1)
        songs = songs + ",";
      end
      size = size+1;
      end
    @songs_s = "\"results\":[#{songs}]"
  end

  def build_playQueue_s()
    @playQueue_s = "\"play_queue\":{#{@songs_s}}"
  end

  def build_searchResult_s
   @searchResult_s = "\"search_results\":{#{@orderBy_s},#{@orderByWay_s},#{@firstResult_s},#{@resultCount_s},#{@totalResult_s},#{@songs_s}}"
  end

  def build_defaultSearchResult_s
   @searchResult_s = "\"search_results\":\"null\""
  end

  # --- --- --- ---

  # action on events
  def on_refresh_request(playlist, position, library, timestamp, client_timestamp, connected)
    @refreshed = 0;
    if(client_timestamp <= timestamp)
      refresh_currentMid(playlist[position]);
      refresh_currentSong(library.get_artist(@currentMid), library.get_title(@currentMid));
      build_songs_s(playlist, position, library);
      build_currentSong_s();
      build_playQueue_s();
      @refreshed = 1;
    end
    refresh_timestamp();
    refresh_connected(connected);
    build_timestamp_s();
    build_channelInfos_s();
  end

  def on_search_request(library, json_obj)
    result = library.secure_request(json_obj["search_value"], json_obj["search_field"], json_obj["order_by"], json_obj["order_by_way"], json_obj["first_result"], json_obj["result_count"]);
    build_requestSongs_s(result);
    refresh_orderBy(json_obj["order_by"]);
    refresh_orderByWay(json_obj["order_by_way"]);
    refresh_firstResult(json_obj["first_result"]);
    if (json_obj["result_count"] == nil) or (json_obj["result_count"] > result.size())
      refresh_resultCount(result.size());
    else
      refresh_resultCount(json_obj["result_count"]);
    end
    total_result = library.get_total(json_obj["search_field"], json_obj["search_value"])
    refresh_totalResult(total_result);
    build_orderBy_s();
    build_orderByWay_s();
    build_resultCount_s();
    build_totalResult_s();
    build_firstResult_s();
    build_searchResult_s();
    refresh_timestamp();
    build_timestamp_s();
  end
  
  def on_search_error()
    refresh_timestamp();
    build_timestamp_s();
    build_defaultSearchResult_s();
  end

  # --- --- --- ---
  
  # get reply functions

  def get_info_reply()
    if @refreshed == 1
      reply = "{#{@timestamp_s},#{@currentSong_s},#{@channelInfos_s},#{@playQueue_s}}"; 
    else
      reply = "{#{@timestamp_s},#{@channelInfos_s}}"; 
    end
    json_obj = JSON.load(reply);
    json_str = JSON.generate(json_obj);
  
    return json_str;
  end

  def get_info_search_reply()
    if @refreshed == 1
      reply = "{#{@timestamp_s},#{@currentSong_s},#{@channelInfos_s},#{@playQueue_s},#{@searchResult_s}}"; 
    else
      reply = "{#{@timestamp_s},#{@channelInfos_s},#{@searchResult_s}}"; 
    end 
    json_obj = JSON.load(reply);
    json_str = JSON.generate(json_obj);
  
    return json_str;
  end

  def get_search_reply()
    reply = "{#{@timestamp_s},#{@searchResult_s}}"; 
    json_obj = JSON.load(reply);
    json_str = JSON.generate(json_obj);
    
    return json_str;
  end

  def s_to_obj(s)
    req_table = s.split(/([^=]*)=([^&]*)&?/);
    json_struct = JSON.parse(req_table[2]);
    return json_struct;
  end
end

