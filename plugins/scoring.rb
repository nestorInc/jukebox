require 'yaml/store'

module YamlLogger

  # log any action on current entry to channel_action.log file
  def log_action(action, song)
    @@log_store ||= YAML::Store.new "channel_action.log"
    @@log_store.transaction do
      @@log_store['actions'] ||= []
    end

    action_object = [[action,
                      { :mid => song.mid,
                        :artist => song.artist,
                        :album => song.album,
                        :genre => song.genre}]]

    puts action_object.to_yaml

    @@log_store.transaction do
      @@log_store['actions'] += action_object
    end
  end
end


module ChannelMixin
  include YamlLogger

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
  include YamlLogger

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

  def initialize()
    @scores = []
    @indexes = {
      :artists => Hash.new { |hash, key| hash[key] = [] },
      :albums => Hash.new { |hash, key| hash[key] = [] },
      :genres => Hash.new { |hash, key| hash[key] = [] },
    }
    @entries = 0

    load()
  end

  def populate()
    # populate scores with null values for each song
    # from db
    songs = db.request("mid, artist, album, genre",  nil, nil, nil, nil, nil)
    songs.each do |song|
      register_song(song.mid, song.artist, song.album, song.genre)
    end
  end

  def register_song(mid, artist, album, genre)
    # scores.push([mid, score])
    # Score=Struct.new :mid, :score
    score = [mid, 0]
    @scores << score
    # add ref(mid, score) to indexes.artists, album, genre
    @indexes[:artists][artist].push(score)
    @indexes[:albums][album].push(score)
    @indexes[:genres][genre].push(score)
  end

  def promote(mid, artist, album, genre)
    # +1
    # join on artist, album, genre
    #song = db.request("mid, artist, album, genre",  mid.to_s, "mid", nil, nil, nil).first

    # I think over promotion can be good.
    indexes[:artists][artist].each do |score|
      score[1] += 1
    end
    indexes[:albums][album].each do |score|
      score[1] += 1
    end
    indexes[:genres][genre].each do |score|
      score[1] += 1
    end
  end

  def demote(mid, artist, album, genre)
    # /2
    # join on artist, album, genre
    #song = db.request("mid, artist, album, genre",  mid.to_s, "mid", nil, nil, nil).first

    # uniq to demote only once
    result_set = (indexes[:artists][artist] +
                  indexes[:albums][album] +
                  indexes[:genres][genre]).uniq
    result_set.each do |score|
      score[1] /= 2
    end
  end

  def dump(filename="learning.log")
    # dump this class
    store = YAML::Store.new filename
    store.transaction do
      store[:scores] = scores
      store[:indexes] = indexes
    end
  end

  def load(filename="learning.log")
    # load up previous learning
    store = YAML::Store.new filename
    store.transaction do
      @scores = store[:scores]
      @indexes = store[:indexes]
    end
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
