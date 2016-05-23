module ChannelMixin
  def fetchData()
    nb_preload = 11
    nb_preload = [@library.get_nb_songs(), nb_preload].min;
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
end

module SongQueueMixin
end
