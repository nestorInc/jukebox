class Playlist
  attr_reader :list;

  def initialize(params = {})
    @id     = params["pid"];
    @list   = params["list"];
    @list   = @list.split(",").map { |v| v.to_i; } if(@list);
    @list ||= [];
  end

  def add(pos = nil, mid)
    return false if(mid == nil);
    pos = check_pos(pos);
    @list.insert(pos, mid);
    pos;
  end

  def del(pos)
    return false if(pos == nil);
    v = @list.delete_at(pos);
    v ||= false;
    v;
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
  def check_pos(pos)
    return @list.size() if(pos == nil || pos < 0 || pos > @list.size());
    pos;
  end
end
