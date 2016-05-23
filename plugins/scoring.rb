require 'yaml/store'

module ChannelMixin
  def fetchData()
    nb_preload = 11
    nb_preload = 1 if(@nb_songs <=  15) # first we check the number of songs in the database leading to left_side (playlist : <s> s s s *c* s s s)
    delta     = [ nb_preload - @queue.size, 0 ].max;

    return if(nb_preload <= 0)

    songs = @library.get_files(delta).map(&:mid);
    last_insert = @queue[-nb_preload..-1] || [];
    songs -= last_insert;

    songs.each do |mid|
      @queue.add(mid)
    end
    super();
  end


  #XXXdlet: overrinding Channel next function. is it ruby's way ?
  def next()
    super
    log("uber plugin talking")
    log_action(__method__)
  end


  # log any action on current entry to channel_action.log file
  def log_action(action)
    filename = "channel_action.log"
    require 'yaml/store'
    log_store = YAML::Store.new filename

    action_object = [action,
                     ["artist" => @currentEntry.artist,
                      "album" => @currentEntry.album,
                      "genre" => @currentEntry.genre]]

    puts action_object.to_yaml

    log_store.transaction do
      log_store['actions'] += action_object
    end
  end

end

module SongQueueMixin
  def setlib(library)
    @library = library
  end

  def add(pos = nil, mid)
    super(pos, mid);
    log_action(__method__, mid)
  end

  def del(pos)
    mid = super(pos);
    log_action(__method__, mids)
    mid
  end

  # log any action on current entry to channel_action.log file
  def log_action(action, mid)
    begin
      puts mid
      song = @library.get_file(mid).first
      
      filename = "channel_action.log"
      log_store = YAML::Store.new filename
      
      action_object = [action,
                       ["artist" => song.artist,
                        "album" => song.album,
                        "genre" => song.genre]]

      puts action_object.to_yaml

      log_store.transaction do
        log_store['actions'] += action_object
      end
    rescue => e
      error("error scoring #{e}")
    end
  end
end
