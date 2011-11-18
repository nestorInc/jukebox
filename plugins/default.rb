module Plugin
  def default()
    nb_preload = 11
    nb_preload = 1 if(@nb_songs <=  15) # first we check the number of songs in the database leading to left_side (playlist : <s> s s s *c* s s s)
      
    delta     = [ nb_preload - mids().size, 0 ].max;
    delta.times {
      # keep a file from being include twice in the next x songs
      last_insert = @history.list.last(nb_preload);
      begin
        entry = @library.get_file().first;
      end while last_insert.include?(entry.mid) # the space we look is (10 + preload) wide (30min) see above
      pos = @history.add(entry.mid);
    }
  end

  def default_next_callback
  end
  
  def default_previous_callback
  end

  def default_add_callback
  end

  def default_rem_callback
  end

  def default_move_callback
  end
end
