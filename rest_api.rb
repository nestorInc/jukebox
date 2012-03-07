require 'http.rb'

class QueueRestApi < HttpRest
  def initialize(list, library)
    @list    = list;
    @library = library;
    super();
  end

  def update(s, req)
    puts "update"
    ch   = @list[s.user];
    rep  = HttpResponse.new(req.proto, 200, "OK");
    json = JSON.parse(req.data || "");

    case(req.remaining)
    when "next"
      rep.setData("<html><head><title>next</title></head><body><H1>Next</H1></body></head>");
      ch.next();
    when "previous"
      rep.setData("<html><head><title>Previous</title></head><body><H1>Previous</H1></body></head>");
      ch.previous();
    when "add"
      ch.queue.add(json["index"], json["mid"]);
    when "del"
      ch.queue.del(json["index"]);
    when "move"
      ch.queue.move(json["index_old"], json["index_new"]);
    when "shuffle"
      ch.queue.shuffle();
    else
      return nil;
    end

    rep;
  end

  def view(s, req)
    ch   = @list[s.user];
    rep  = HttpResponse.new(req.proto, 200, "OK");

    json = ch.queue.to_client(@library);
    str = JSON.generate(json);
    debug(str);
    rep.setData(str);

    rep;
  end
end

class RestApi < HttpNode
  def initialize(list, library)
    super("queue" => QueueRestApi.new(list, library));
  end
end
