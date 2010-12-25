#!/usr/bin/env ruby

require "socket"
require "fcntl"

library_file = File.new("/mp3/library", "r");
library = [];
library_file.each_line { | line |
  library += [ line.rstrip() ]
}
library_file.close();
server = TCPServer.new(nil, 20000)

data = [];
def skip_tag(data)
  size = 0;
  if(data[0 .. 2] == "ID3")
    size += data[6].unpack("c")[0].to_i();
    size = size * 128;
    size += data[7].unpack("c")[0].to_i();
    size = size * 128;
    size += data[8].unpack("c")[0].to_i();
    size = size * 128;
    size += data[9].unpack("c")[0].to_i();

    size += 10;
    data.slice!(0 ... size-1);
  end
end

def load_new_file(library)
  pos = rand(library.size - 1);
  $stderr.puts library[pos];
  mp3_file = File.new(library[pos], "rb");
  data = mp3_file.read();
  mp3_file.close();
  skip_tag(data);
  return data;
end

read_fd  = [ server ];
write_fd = [ $stdout ];

opt = $stdout.fcntl(Fcntl::F_GETFL )
opt |= Fcntl::O_NONBLOCK;
$stdout.fcntl(Fcntl::F_SETFL, opt);

puts $stdout.fcntl(Fcntl::F_GETFL ).inspect + "aa\n";

client_data = {}

while(TRUE) do
  data = load_new_file(library) if(data.size == 0);
  r,w,e = IO.select(read_fd, write_fd, nil, nil);
  r.each { |read_io|
    if(read_io == server)
      clt = server.accept();
      read_fd += [ clt ];
      client_data[clt] = "";
    else
      cdata = client_data[read_io];
      cdata += read_io.recv(1024);
      cmds = cdata.split("\n", 2);
      cmds.each { |cmd|
        case cmd.rstrip().downcase()
          when "0", "play"
            $stderr.puts "cmd play";
          when "1", "close"
            $stderr.puts "cmd play";
          when "2", "stop"
            $stderr.puts "cmd play";
          when "3", "play_song"
            $stderr.puts "cmd play";
          when "6", "prec"
            data = load_new_file(library);
            $stderr.puts "cmd play";
          when "7", "next"
            data = load_new_file(library);
            $stderr.puts "cmd next";
#  change_auto_man, /* 4 */
#  change_random, /* 5 */
#  current, /* 8 */
#  set_mixer, /* 9 */
#  get_mixer, /* 10 */
#  add_playlist, /* 11 */
#  clean_playlist, /* 12 */
#  ret_nbr_playlist, /* 13 */
#  delete_playlist, /* 14 */
#  enable_playlist, /* 15 */
#  get_page, /* 16 */
#  get_info, /* 17 */
#  reload_library, /* 18 */
#  up_playlist, /* 19 */
#  down_playlist, /* 20 */
#  set_playlist, /* 21 */
#  freeze}; /* 22 */

        else
        end
      }
    end
  }
  w.each { |write_io|
    if(write_io == $stdout)
      tmp  = data.slice!(0 ... 1023);
      $stdout.write(tmp);
    end
  }
end
