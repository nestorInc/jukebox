module ChannelMixin
  def muse()
    display("Using <<muse>> plugin loader on channel #{@name}")
    if(@nb_songs > 10)
      nb_preload = 6
    else
      nb_preload = 1
    end
    delta = @history.size()-@pos-1;
    if(delta < nb_preload)
      preload = nb_preload - delta;
      # here, we calculate the left side of the anti double inclusion range
      # This allows not listening the same music again during the next 30 minutes.
      if(@pos-10 > 0); 
        antiDoubleBegin = @pos-10;
      else
        antiDoubleBegin = 0;
      end 
      # this allows to have always at least @nbPreload songs in advance from the current position : preloading some files
      for i in 1..preload
        # keep a file from being include twice in the next 15 songs
        lastInsertions = @history[antiDoubleBegin..-1];
        begin
         entry = @library.get_random_from_artist("muse");
        end while lastInsertions.include?(entry[0]) # the space we look is (10 + preload) wide (30min) see above
        @history.push(entry[0]);
        @currentEntry = entry if(i == 0); # store the current entry to open the good file (see below)
      end 
    end 
  end
end

module SongQueueMixin
end
