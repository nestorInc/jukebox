
def display(str)
  print "[", Time.now(), "] [\033[32minfo\033[0m] ";
  puts str;
end

def warning(str)
  print "[", Time.now(), "] [\033[33mwarning\033[0m] ";
  puts str;
end
