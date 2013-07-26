module ChannelMixin
  def fetchData()
    nb_preload = 11
    nb_preload = [@library.get_nb_songs(), nb_preload].min;
    delta     = [ nb_preload - @queue.size, 0 ].max;
    if(nb_preload > 0)
      delta.times {
        # keep a file from being include twice in the next x songs
        last_insert = @queue[-nb_preload..-1] || [];
        begin
          entry = @library.get_file().first;
        end while last_insert.include?(entry.mid) # the space we look is (10 + preload) wide (30min) see above
        pos = @queue.add(entry.mid);
      }
    super();
    end
  end
end

module SongQueueMixin
end
