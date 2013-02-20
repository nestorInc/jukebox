require 'yaml/store'

module ChannelMixin
  def fetchData()
    nb_preload = 11
    nb_preload = 1 if(@nb_songs <=  15) # first we check the number of songs in the database leading to left_side (playlist : <s> s s s *c* s s s)

    delta     = [ nb_preload - @queue.size, 0 ].max;
    delta.times {
      # keep a file from being include twice in the next x songs
      last_insert = @queue[-nb_preload..-1] || [];
      begin
        entry = @library.get_file().first;
      end while last_insert.include?(entry.mid) # the space we look is (10 + preload) wide (30min) see above
      pos = @queue.add(nil, entry.mid, :log => false);
    }
    super();
  end

  #XXXdlet: overriding Channel next function. is it ruby's way ?
  def next()
    super
    log("uber plugin talking")
    log_action(__method__, @currentEntry)
  end

end

module SongQueueMixin
  def setlib(library)
    @library = library
  end

  def add(pos = nil, mid=0, opt={:log => true})
    super(pos, mid);
    song = @library.get_file(mid).first
    log_action(__method__, song) if(opt[:log]);
    pos;
  end

  def del(pos)
    mid = super(pos);
    song = @library.get_file(mid).first
    log_action(__method__, song)
    mid;
  end
end


class Classifier
  attr_accessor :scores
  attr_accessor :indexes
  attr_accessor :entries
  attr_accessor :total_sum

  # scores   = [ (mid, score), ... ]
  # indexes  = { :artists = {name, [score_item0, ....]},
  #              :genre   = ...

  def initialize(db)
    @scores = []
    @indexes = {
      :artists => Hash.new { |hash, key| hash[key] = [] },
      :albums => Hash.new { |hash, key| hash[key] = [] },
      :genres => Hash.new { |hash, key| hash[key] = [] },
    }
    @entries = 0

    # populate scores with null values for each song
    # from db ?

    songs = db.request("mid, artist, album, genre",  nil, nil, nil, nil, nil)
    songs.each do |song|
      register_song(song)
    end

  end

  def register_song(song)
    # scores.push([mid, score])
    # Score=Struct.new :mid, :score
    score = [song.mid, 0]
    @scores << score
    # add ref(mid, score) to indexes.artists, album, genre
    @indexes[:artists][song.artist].push(score)
    @indexes[:albums][song.album].push(score)
    @indexes[:genres][song.genre].push(score)
  end

  def promote(mid, db)
    # +1
    # join on artist, album, genre
    song = db.request("mid, artist, album, genre",  mid.to_s, "mid", nil, nil, nil).first

    indexes[:artists][song.artist].each do |score|
      score[1] += 1
    end
    indexes[:albums][song.album].each do |score|
      score[1] += 1
    end
    indexes[:genres][song.genre].each do |score|
      score[1] += 1
    end
  end

  def demote()
    # /2
    # join on artist, album, genre
    song = db.request("mid, artist, album, genre",  mid.to_s, "mid", nil, nil, nil).first

    indexes[:artists][song.artist].each do |score|
      score[1] /= 2
    end
    indexes[:albums][song.album].each do |score|
      score[1] /= 2
    end
    indexes[:genres][song.genre].each do |score|
      score[1] /= 2
    end
  end

  def dump()
    # dump this class
  end

  def load()
    # load up previous learning
  end

end

=begin

$: << ".."
require "db.rb"
require "plugins/scoring.rb"

library = Library.new();
classifier = Classifier.new(library)

classifier.promote(2, library)

puts classifier.scores[0].to_s
puts classifier.scores[1].to_s
puts classifier.scores[2].to_s

=end
