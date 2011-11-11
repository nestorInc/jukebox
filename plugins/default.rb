module Plugin
  def default()
    if(@nb_songs > 15) # first we check the number of songs in the database leading to left_side (playlist : <s> s s s *c* s s s)
      nb_preload = 11
    else
      nb_preload = 1
    end
    delta = @history.size()-@pos-1;
    if(delta < nb_preload)
      preload = nb_preload - delta;
      # here, we calculate the left side of the anti double inclusion range
      # This allows not listening the same music again during the next 30 minutes.
      if(@pos-nb_preload > 0); 
        left_side = @pos-nb_preload;
      else
        left_side = 0;
      end 
      # this allows to have always at least nb_preload songs in advance from the current position : preloading some files
      for i in 1..preload
        # keep a file from being include twice in the next x songs
        last_insert = @history[left_side..-1];
        begin
         entry = @library.get_file();
        end while last_insert.include?(entry.mid) # the space we look is (10 + preload) wide (30min) see above
        @history.push(entry.mid);
        @currentEntry = entry if(i == 0); # store the current entry to open the good file (see below)
      end 
    end 
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
