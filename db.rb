#!/usr/bin/env ruby

require 'sqlite3'

load 'display.rb'

class Song
  attr_accessor :mid
  attr_accessor :src
  attr_accessor :dst
  attr_accessor :title
  attr_accessor :artist
  attr_accessor :album
  attr_accessor :years
  attr_accessor :status

  def initialize(params = {})
    @mid    = params["mid"];
    @src    = params["src"] && params["src"].encode(Encoding.locale_charmap);
    @dst    = params["dst"] && params["dst"].encode(Encoding.locale_charmap);
    @title  = params["title"];
    @artist = params["artist"];
    @album  = params["album"];
    @years  = params["years"];
    @status = params["status"];
  end

  def to_hash()
    { :mid    => @mid,
      :src    => @src,
      :dst    => @dst,
      :title  => @title,
      :artist => @artist,
      :album  => @album,
      :years  => @years,
      :status => @status
    }
  end

  def to_s()
    str = "#{@title} - #{@artist} - #{@album}';"
  end
end

class Library
  FILE_WAIT              = 1;
  FILE_BAD_TAG           = 2;
  FILE_ENCODING_PROGRESS = 3;
  FILE_ENCODING_FAIL     = 4;
  FILE_OK                = 5;

  def initialize()
    @db = SQLite3::Database.new("jukebox.db")
    @db.results_as_hash = true 
    @db.execute( "create table if not exists library (
                       mid INTEGER PRIMARY KEY,
                       src TEXT, dst TEXT,
                       title TEXT, artist TEXT, album TEXT, years INTEGER UNSIGNED NULL,
                       status INTEGER);" );
    req = @db.prepare("UPDATE library SET status=#{FILE_WAIT} WHERE status=#{FILE_ENCODING_PROGRESS}");
    res = req.execute!();
    req.close();
    res;

    log("library initialized.");

    @translate_song = Proc.new { |row|
      Song.new(row);
    }
  end

# searching methods here 
#SELECT * FROM music ORDER BY mid LIMIT 60,10;
  
  def get_nb_songs()
    req = @db.prepare("SELECT COUNT (*) FROM library WHERE status=#{FILE_OK}");
    res = req.execute!();
    req.close();
    res[0].at(0);
  end
  
  def get_total(field, value)
    req = @db.prepare("SELECT COUNT (*) FROM library WHERE status=#{FILE_OK} AND #{field} LIKE \"%\" || :name || \"%\"");
    res = req.execute!(:name => value);
    req.close();
    res[0].at(0);
  end
  
  def get_file(*mids)
    if(mids.size == 0)
      req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_OK} ORDER BY RANDOM() LIMIT 1");
      res = req.execute().map(&@translate_song).first;
      req.close();
    else
      req = @db.prepare("SELECT * FROM library WHERE mid=? AND status=#{FILE_OK} LIMIT 1");
      res = mids.map { |mid|
        req.execute(mid).map(&@translate_song).first;
      }
      req.close();
    end

    res;
  end

  def get_random_from_artist(artist)
    if(artist != nil)
      req = @db.prepare("SELECT * FROM library WHERE artist LIKE \"%#{artist}%\" AND status=#{FILE_OK} ORDER BY RANDOM() LIMIT 1");
      res = req.execute();
      req.close();
    end
    res.map(&@translate_song).first
  end

# search value
# search field
# order by order by way
# first result result count

  def secure_request(value, field, orderBy, orderByWay, firstResult, resultCount)
    field   = "artist" if(field   != "title" && field   != "album");
    orderBy = "artist" if(orderBy != "title" && orderBy != "album");
    if(orderByWay == "down")
      orderByWay = "DESC";
    else
      orderByWay = "ASC";
    end
    firstResult = 0  if(!(firstResult.is_a? Integer))
    resultCount = 10 if(!(resultCount.is_a? Integer))
    resultCount = 50 if((resultCount > 200) or (resultCount < 0))
    firstResult = 0  if(firstResult < 0)

    return request(value, field, orderBy, orderByWay, firstResult, resultCount); 
  end

  def request(value, field, orderBy, orderByWay, firstResult, resultCount)
    request  = "SELECT * FROM library WHERE status=#{FILE_OK} ";
    request << "AND #{field} LIKE \"%\" || :name || \"%\" " if(field != nil);
    if(orderBy != nil)
      request << "ORDER BY #{orderBy} ";
      request << "#{orderByWay} " if(orderByWay != nil);
    end
    if(firstResult or resultCount)
      if(firstResult)
        request << "LIMIT #{firstResult},#{resultCount}";
      else
        request << "LIMIT #{resultCount}";
      end
    end
    warning("Querying database : #{request}");
    req = @db.prepare(request);
    res = req.execute(:name => value).map(&@translate_song);
    req.close();
    return res;
  end

  def encode_file()
    begin
      req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_WAIT} LIMIT 1");
      res = req.execute().map(&@translate_song);
      req.close();
      return nil if(res[0] == nil)
      res = res.first;
    rescue => e
      error(e.to_s + res.to_s, true, $error_file);
      change_stat(res[0], FILE_ENCODING_FAIL);
      res = encode_file();
    end
    res;
  end

  def change_stat(mid, state)
    req = @db.prepare("UPDATE library SET status=? WHERE mid=?");
    res = req.execute!(state, mid);
    req.close();
    res;
  end

  def check_file(src)
    req = @db.prepare("SELECT * FROM library WHERE src=?");
    res = req.execute!(src);
    req.close();
    res.size == 0;
  end

  def add(song)
    req = @db.prepare("INSERT INTO library (mid, src, dst, title, artist, album, years, status) VALUES(:mid, :src, :dst, :title, :artist, :album, :years, :status)");
    req.execute(song.to_hash);
    req.close();
  end
end
