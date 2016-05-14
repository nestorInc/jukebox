require "worker.rb"

$:.unshift File.dirname($0)


class Messaging
  def initialize()
    @topic = {}
  end

  def create(name, nb = 1, &process)
    @topic[name] = {
      :process => process,
      :worker  => Worker.new(nb)
    }
  end

  def send(dst, *data)
    t = @topic[dst]
    raise("Invalid topic") if(t == nil);
    t[:worker].add(*data, &t[:process])
  end
end
