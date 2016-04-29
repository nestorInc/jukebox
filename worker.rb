require 'thread'

class Worker
  def initialize(n = 4)
    @w = []
    @q = Queue.new
    n.times do |i|
      t = Thread.new do
        while true do
          block, args = @q.pop()
          block.call(*args)
        end
      end
      @w.push(t);
    end
  end

  def add(*args, &block)
    @q.push([block, args]);
  end
end
