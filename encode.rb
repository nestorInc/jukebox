#!/usr/bin/env ruby

class Encode
      def initialize()
      end
end
musik_dir = "/home/aetu/musik";
encoded_dir = "/home/aetu/musik/encoded";

files = Dir.glob(musik_dir + "/*");

hash = {}
begin 
  File.open(encoded_dir + "/list") { | fd |
    fd.each { |l|
      hash[l.strip] = true;
    }
  }
rescue
end

new_files = [];

files.each { | f |
  name = f.scan(/.*\/(.*)/);
  name = name[0][0];
  if(hash[name] == nil)
    hash[name] = true;
    new_files.push(f);
  end
}

new_files.each { | f |
  name = f.scan(/.*\/(.*)/);
  name = name[0][0];

  val = system("mpg123 --stereo -r 44100 -s \"#{f}\" | lame - \"#{encoded_dir + "/" + name}\" -r" );
  puts val.inspect;
}

File.open(encoded_dir + "/list", "w") { | fd |
  hash.each { | k, v |
    fd.write(k + "\n");
  }
}
