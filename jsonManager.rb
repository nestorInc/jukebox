#!/usr/bin/env ruby

require 'json'
require 'rev'

load 'db.rb'
load 'channel.rb'

class JsonManager
  def initialize(library)
    @currentMid = 0;
    @currentTitle = [];
    @currentArtist = [];
    @reply = "{}";
  end

  def refresh(playlistMids, pos, library, timestamp)
    @currentMid = playlistMids[pos-1];
    @currentTitle = library.get_title(@currentMid);
    @currentArtist = library.get_artist(@currentMid);
    songs = "";
    for i in pos..playlistMids.size()-1
      title = library.get_title(playlistMids[i]);
      artist = library.get_artist(playlistMids[i]);
      if(i < playlistMids.size()-1)
        songs = songs + "{\"artist\":\"#{artist[0]}\",\"title\":\"#{title[0]}\",\"duration\":270}";
        if(i < (playlistMids.size()-2))
          songs = songs + ",";
        end
      end
    end
    @reply = "{\"timestamp\":#{timestamp},\"current_song\":{\"id\":#{@currentMid},\"title\":\"#{@currentTitle[0]}\",\"artist\":\"#{@currentArtist[0]}\",\"total_time\":203,\"elapsed_time\":70},\"channel_infos\":{\"listener_count\":3},\"play_queue\":{\"songs\":[#{songs}]}}";
  end

  def current_to_s() 
    json_obj = JSON.load(@reply);
    json_str = JSON.generate(json_obj);
    return json_str;
  end

  def s_to_obj(s)
    req_table = s.split(/([^=]*)=([^&]*)&?/);
    json_struct = JSON.parse(req_table[2]);
    return json_struct;
  end
end

