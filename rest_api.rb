require 'http.rb'

class QueueRestApi < HttpRest
  def initialize(list, library)
    @list    = list;
    @library = library;
    super();
  end

  def update(s, req)
    ch   = @list[s.user];
    json = JSON.parse(req.data || "");

    case(req.remaining)
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

    view(s, req);
  end

  def view(s, req)
    ch   = @list[s.user];
    rep  = HttpResponse.new(req.proto, 200, "OK",
                            "Content-Type" => "application/json");

    json = {}
    json[:queue] = ch.queue.to_client(@library);
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
