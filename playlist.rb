require 'plugable.rb'

class Playlist
  include Plugable
  attr_reader :list;

  def initialize(params = {})
    @timestamp   = Time.now().to_i();
    @id          = params["pid"];
    @list        = params["list"];
    @list        = @list.split(",").map { |v| v.to_i; } if(@list);
    @list      ||= [];
  end

  def add(pos = nil, data)
    @timestamp   = Time.now().to_i();
    mids         = expand_data(data);
    pos          = check_pos(pos);
    @list.insert(pos, *mids);
    pos;
  end

  def del(pos)
    @timestamp   = Time.now().to_i();
    raise "Playlist::del Invalid position class" if(pos.class != Fixnum);
    @list.delete_at(pos) || false;
  end

  def move(opos, npos)
    opos = check_pos(opos);
    npos = check_pos(npos);
    add(npos, del(opos));
  end

  def shuffle()
    @list.shuffle!();
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
        v.push(*expand_data(e));
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

class SongQueue < Playlist
  attr_reader :timestamp;

  def initialize()
    @pos = 0;
    super();
  end

  def add(pos = nil, mid)
    pos += @pos + 1 if(pos != nil);
    super(pos, mid);
  end

  def del(pos)
    pos += @pos + 1 if(pos != nil);
    super(pos);
  end

  def move(opos, npos)
    super(opos, npos);
  end

  def next()
    @timestamp = Time.now().to_i();
    @pos += 1;
  end

  def previous()
    @timestamp = Time.now().to_i();
    @pos -= 1 if(@pos > 0);
  end

  def shuffle()
    @timestamp = Time.now().to_i();
    v = @list[@pos+1..-1] || [];
    @list = @list[0..@pos] + v.shuffle;
  end

  def [](range)
    @list[@pos..-1][range];
  end

  def size()
    @list[@pos..-1].size();
  end

  def to_client(lib)
    queue = self[1..-1];
    if(queue.size() != 0)
      queue = lib.get_file(*queue).reject(&:nil?).map(&:to_client);
    end

    {
      :updated => @timestamp,
      :songs   => queue || []
    }
  end
end
