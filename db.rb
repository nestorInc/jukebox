#!/usr/bin/env ruby

require 'sqlite3'

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
  end

  def get_file(mid = nil)
    if(mid == nil)
      req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_OK} ORDER BY RANDOM() LIMIT 1");
      res = req.execute!();
    else
      req = @db.prepare("SELECT * FROM library WHERE mid=? AND status=#{FILE_OK} LIMIT 1");
      res = req.execute!(mid);
    end

    res[0];
  end

  def encode_file()
    req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_WAIT} LIMIT 1");
    res = req.execute!();
    return nil if(res.size == 0);
    return res[0];
  end

  def change_stat(mid, state)
    req = @db.prepare("UPDATE library SET status=? where mid=?");  
    res = req.execute!(state, mid);
  end

  def all_file()
    req = @db.prepare("SELECT * from library");  
    res = req.execute!();
    p res;
    res;
  end

  def check_file(src)
    req = @db.prepare("SELECT * from library where src=?");  
    res = req.execute!(src);
    res.size == 0;
  end

  def add(src, dst, title, artist, album, years, status)
    req = @db.prepare("INSERT INTO library (mid, src, dst, title, artist, album, years, status) VALUES(?,?,?,?,?,?,?,?)");
    req.execute(nil, src, dst, title, artist, album, years, status);
  end

end


