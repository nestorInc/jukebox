SAVE_LAST_EVENT = 20;

$events = [];

def print_color(prefix, color = 2, str, file)
  line = "[#{Time.now()}] [\033[#{30+color}m#{prefix}\033[0m] #{str}";
  puts(line);
  file.puts(line) if(file);
end

def display(prefix, color, str, file, print = true)
  print = true if(ENV["IS_DEBUG"] != nil)
  print_color(prefix, color, str, file) if(print == true);
  $events.push([Time.now(), str]);
  $events = $events.last(SAVE_LAST_EVENT);  
end

def log(str, print = true, file = nil)
  display("info", 2, str, file, print);
end

def warning(str, print = true, file = nil)
  display("warning", 3, str, file, print);
end

def error(str, print = true, file = nil)
  display("error", 1, str, file, print);
end

def debug(str, file = nil)
  display("debug", 2, str, file, false);
end

def dump_events()
  $events.reverse.map { |time, str|
    "#{time} #{str}"
  }.join("\n");
end
