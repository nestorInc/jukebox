# hack to get root dir for import
$:.unshift File.dirname(".")

require 'db.rb'
require 'playlist.rb'

library = Library.new();

queue = SongQueue.new();
# add shuffle capacity
queue.extend(ShuffleForSongQueue)
queue.SFSQsetlib(library)

songs = (1..14).to_a

puts songs
queue.build_categories(songs)
puts queue.instance_variable_get(:@categories).each_value { |v| v }
new_songqueue = queue.userShuffle(songs)
puts new_songqueue
new_songqueue.each { |s| puts library.get_file(s).first.album }

