#!/usr/bin/env ruby

require 'json'
require 'rev'

class JsonManager
  
  def initialize(library)
    @timestamp = 0;
    @currentMid = 0;
    @currentTitle = [];
    @currentArtist = [];
    @nbUsers = 0;
     
    @currentSong_s = ""; 
    @playQueue_s = "";
    @timestamp_s = "";
    @channelInfos_s = "";
    @listenerCount_s = "";
    @song_s = "";
  end

  # --- refresh functions ---

  def refresh_timestamp()
    @timestamp = Time.now().to_i();
  end

  def refresh_currentMid(currentMid)
    @currentMid = currentMid;
  end

  def refresh_currentSong(currentArtist, currentTitle)
    @currentArtist = currentArtist;
    @currentTitle = currentTitle;
  end

  def refresh_nbUsers(nbUsers)
    @nbUsers = nbUsers;
  end

  # --- string builders ---

  def build_timestamp_s()
    @timestamp_s = "\"timestamp\":#{@timestamp}";
  end

  def build_currentSong_s()
    @currentSong_s = "\"current_song\":{\"id\":#{@currentMid},\"title\":\"#{@currentTitle[0]}\",\"artist\":\"#{@currentArtist[0]}\",\"total_time\":203,\"elapsed_time\":70}";
  end

  def build_channelInfos_s()
    build_listenerCount_s();
    @channelInfos_s = "\"channel_infos\":{#{@listenerCount_s}}";
  end

  def build_listenerCount_s()
    @listenerCount_s = "\"listener_count\":#{@nbUsers}"
  end

  def build_songs_s(playlist, position, library)
    songs = ""
    playlistSize = playlist.size();
    for i in position+1..playlistSize-1
      title = library.get_title(playlist[i]);
      artist = library.get_artist(playlist[i]);
      if(i < playlistSize-1)
        songs = songs + "{\"artist\":\"#{artist[0]}\",\"title\":\"#{title[0]}\",\"duration\":270}";
        if(i < (playlistSize-2))
          songs = songs + ",";
        end
      end
    end
    @songs_s = "\"songs\":[#{songs}]"
  end

  def build_playQueue_s()
    @playQueue_s = "\"play_queue\":{#{@songs_s}}"
  end

  # --- --- --- ---

 	 # action on events
  def on_refresh_request(playlist, position, library, timestamp)
    if(@timestamp < timestamp)
      refresh_timestamp();
      refresh_currentMid(playlist[position]);
      refresh_currentSong(library.get_artist(@currentMid), library.get_title(@currentMid));
      build_songs_s(playlist, position, library);
      build_timestamp_s();
      build_currentSong_s();
      build_channelInfos_s();
      build_playQueue_s();
    end
  end

  # --- --- --- ---
  
  # get reply functions

  def get_info_reply()
    reply = "{#{@timestamp_s},#{@currentSong_s},#{@channelInfos_s},#{@playQueue_s}}"; 
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

