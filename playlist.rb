class Playlist
  attr_reader :list;

  def initialize(params = {})
    @id     = params["pid"];
    @list   = params["list"];
    @list   = @list.split(",").map { |v| v.to_i; } if(@list);
    @list ||= [];
  end

  def add(pos = nil, data)
    mids = expand_data(data);
    pos  = check_pos(pos);
    @list.insert(pos, *mids);
    pos;
  end

  def del(pos)
    raise "Playlist::del Invalid position class" if(pos.class != Fixnum);
    @list.delete_at(pos) || false;
  end

  def move(opos, npos)
    opos = check_pos(opos);
    npos = check_pos(npos);
    add(npos, del(opos));
  end

  def [](range)
    @list[range];
  end

  def to_db()
    { :pid    => @id,
      :list   => @list.join(",")
    }
  end

  def self.from_db()
    Proc.new { |row|
      next if(row == nil);
      self.new(row);
    }
  end

  private
  def expand_data(data)
    case(data)
    when Fixnum
      [ data ];
    when Playlist
      data.list;
    when Song
      [ data.mid ];
    when Array
      v = [];
      data.each { |e|
        v.push(expand_data(e));
      }
      v;
    else
      raise "Playlist::add Invalid mids class";
    end
  end

  def check_pos(pos)
    return @list.size() if(pos == nil || pos < 0 || pos > @list.size());
    pos;
  end
end
