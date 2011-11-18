require 'http.rb'

class BasicApi < HttpNode

  def initialize(list)
    @list     = list;

    super();
  end

  def on_request(s, req)
    action      = req.remaining;
    ch          = @list[s.user];

    rep = HttpResponse.new(req.proto, 200, "OK");
    if(ch == nil)
      msg = JsonManager.create_message(JsonManager::MSG_LVL_WARNING,
                                       "Unknown channel #{channelName}");
      rep.setData("<html><head><title>Channel not found</title></head><body><H1>Channel #{s.user}not found</H1></body></head>");
    else
      case(action)
      when "previous"
        rep.setData("<html><head><title>Previous</title></head><body><H1>Previous</H1></body></head>");
        ch.previous()
      when "next"
        rep.setData("<html><head><title>next</title></head><body><H1>Next</H1></body></head>");
        ch.next()
      else
        rep = HttpResponse.generate404(req);
      end
    end
    s.write(rep.to_s);
  end
end
