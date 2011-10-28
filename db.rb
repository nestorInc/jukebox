#!/usr/bin/env ruby

require 'sqlite3'

load 'display.rb'

class Library
  FILE_WAIT              = 1;
  FILE_BAD_TAG           = 2;
  FILE_ENCODING_PROGRESS = 3;
  FILE_ENCODING_FAIL     = 4;
  FILE_OK                = 5;

  def initialize()
    @db = SQLite3::Database.new("jukebox.db")
 
    @db.execute( "create table if not exists library (
                       mid INTEGER PRIMARY KEY,
                       src TEXT, dst TEXT,
                       title TEXT, artist TEXT, album TEXT, years INTEGER UNSIGNED NULL,
                       status INTEGER);" );
    display("library initialized.");
  end

# searching methods here 
#SELECT * FROM music ORDER BY mid LIMIT 60,10;
  
  def get_title(mid)
    req = @db.prepare("SELECT title FROM library WHERE mid=? LIMIT 1");
    res = req.execute!(mid);
    req.close();
    res[0];
  end

  def get_artist(mid)
    req = @db.prepare("SELECT artist FROM library WHERE mid=? LIMIT 1");
    res = req.execute!(mid);
    req.close();
    res[0];
  end

  def get_nb_songs()
    req = @db.prepare("SELECT COUNT (*) FROM library WHERE status=5");
    res = req.execute!();
    req.close();
    res[0].at(0);
  end
  
  def get_file(mid = nil)
    if(mid == nil)
      req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_OK} ORDER BY RANDOM() LIMIT 1");
      res = req.execute!();
      req.close();
    else
      req = @db.prepare("SELECT * FROM library WHERE mid=? AND status=#{FILE_OK} LIMIT 1");
      res = req.execute!(mid);
      req.close();
    end

    res[0];
  end

  def get_random_from_artist(artist)
    if(artist != nil)
      req = @db.prepare("SELECT * FROM library WHERE artist LIKE \"%#{artist}%\" AND status=#{FILE_OK} ORDER BY RANDOM() LIMIT 1");
      res = req.execute!();
      req.close();
    end
    res[0]
  end

# search value
# search field
# order by order by way
# first result result count

  def secure_request(value, field, orderBy, orderByWay, firstResult, resultCount)
    value.gsub!(/"/,'')
    value.gsub!(/'/,'')
    value.gsub!(/\\/,'');
    if((field != "artist") and (field != "title") and (field != "album"))
      field = "artist";
    end
    if((orderBy != "artist") and (orderBy != "title") and (orderBy != "album"))
      orderBy = "artist"; 
    end
    if(orderByWay == "down")
      orderByWay = "DESC";
    else
      orderByWay = "ASC";
    end
    if(!(firstResult.is_a? Integer))
      firstResult = 0;
    end
    if(!(resultCount.is_a? Integer))
      resultCount = 10;
    end
    if((resultCount > 200) or (resultCount < 0))
      resultCount = 50;
    end
    if((firstResult >= resultCount) or (firstResult < 0))
      firstResult = 0;
    end
    return request(value, field, orderBy, orderByWay, firstResult, resultCount); 
  end

  def request(value, field, orderBy, orderByWay, firstResult, resultCount)
    request = "SELECT artist,title,mid FROM library ";
    if(field != nil)
      request += "WHERE #{field} LIKE \"%#{value}%\" ";
    end
    if(orderBy != nil)
      request += "ORDER BY #{orderBy} ";
      if(orderByWay != nil)
        request += "#{orderByWay} ";
      end
    end
    if(firstResult or resultCount)
      if(firstResult)
        request += "LIMIT #{firstResult},#{resultCount}";
      else
        request += "LIMIT #{resultCount}";
      end
    end
    warning("Querying database : #{request}");
    req = @db.prepare(request);
    res = req.execute!()
    req.close();
    return res;
  end

  def encode_file()
    req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_WAIT} LIMIT 1");
    res = req.execute!();
    req.close();
    return nil if(res.size == 0);
    return res[0];
  end

  def change_stat(mid, state)
    req = @db.prepare("UPDATE library SET status=? where mid=?");  
    res = req.execute!(state, mid);
    req.close();
    res;
  end

  def all_file()
    req = @db.prepare("SELECT * from library");  
    res = req.execute!();
    req.close();
    res;
  end

  def check_file(src)
    req = @db.prepare("SELECT * from library where src=?");  
    res = req.execute!(src);
    req.close();
    res.size == 0;
  end

  def add(src, dst, title, artist, album, years, status)
    req = @db.prepare("INSERT INTO library (mid, src, dst, title, artist, album, years, status) VALUES(?,?,?,?,?,?,?,?)");
    req.execute(nil, src, dst, title, artist, album, years, status);
    req.close();
  end

end
