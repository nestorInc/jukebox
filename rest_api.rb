require 'http.rb'

class QueueRestApi < HttpRest
  def initialize(list)
    @list = list;
    super();
  end

  def update(s, req)
    puts "update"
    ch = @list[s.user];
    rep = HttpResponse.new(req.proto, 200, "OK");
    case(req.remaining)
    when "next"
      rep.setData("<html><head><title>next</title></head><body><H1>Next</H1></body></head>");
      ch.next();
    when "previous"
      rep.setData("<html><head><title>Previous</title></head><body><H1>Previous</H1></body></head>");
      ch.previous();
    else
      return nil;
    end

    rep;
  end
end

class RestApi < HttpNode
  def initialize(list)
    super("queue" => QueueRestApi.new(list));
  end
end
