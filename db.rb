#!/usr/bin/env ruby

require 'sqlite3'

require 'display.rb'

class Song
  attr_accessor :mid
  attr_accessor :src
  attr_accessor :dst
  attr_accessor :title
  attr_accessor :artist
  attr_accessor :album
  attr_accessor :years
  attr_accessor :genre
  attr_accessor :track
  attr_accessor :trackNb
  attr_accessor :status
  attr_accessor :bitrate
  attr_accessor :frames
  attr_accessor :duration

  def initialize(params = {})
    @mid      = params["mid"];
    @src      = params["src"] && params["src"].encode(Encoding.locale_charmap);
    @dst      = params["dst"] && params["dst"].encode(Encoding.locale_charmap);
    @title    = params["title"];
    @artist   = params["artist"];
    @album    = params["album"];
    @years    = params["years"];
    @track    = params["track"];
    @trackNb  = params["trackNb"];
    @genre    = params["genre"];
    @status   = params["status"]   && params["status"].to_i;
    @duration = params["duration"] && params["duration"].to_i;
    @bitrate  = params["bitrate"]  && params["bitrate"].to_i;
    @frames   = params["frames"];
    if(@frames == nil)
      @frames = [];
    else
      @frames = @frames.split(",").map { |v| v.to_i(); }
    end
  end

  def to_client()
    res = {}
    res[:mid     ] = @mid      if(@mid);
    res[:title   ] = @title    if(@title);
    res[:artist  ] = @artist   if(@artist);
    res[:album   ] = @album    if(@album);
    res[:years   ] = @years    if(@years);
    res[:track   ] = @track    if(@track);
    res[:trackNb ] = @trackNb  if(@trackNb);
    res[:genre   ] = @genre    if(@genre);
    res[:duration] = @duration if(@duration);
    res;
  end

  def to_db()
    res = {}
    res[:mid     ] = @mid      if(@mid);
    res[:src     ] = @src      if(@src);
    res[:dst     ] = @dst      if(@dst);
    res[:title   ] = @title    if(@title);
    res[:artist  ] = @artist   if(@artist);
    res[:album   ] = @album    if(@album);
    res[:years   ] = @years    if(@years);
    res[:track   ] = @track    if(@track);
    res[:trackNb ] = @trackNb  if(@trackNb);
    res[:genre   ] = @genre    if(@genre);
    res[:status  ] = @status   if(@status);
    res[:bitrate ] = @bitrate  if(@bitrate);
    res[:duration] = @duration if(@duration);
    res[:frames  ] = @frames .map { |v| v.to_s(); }.join(",") if(@frames);
    res;
  end

  def self.from_db()
    Proc.new { |row|
      next if(row == nil);
      self.new(row);
    }
  end

  def to_s()
    str = "#{@title} - #{@artist} - #{@album}"
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
    # Activate the use of foreign keys contraints for sqlite 3
    @db.execute( "PRAGMA foreign_keys = ON;");
    @db.execute( "create table if not exists library (
                       mid INTEGER PRIMARY KEY,
                       src TEXT, dst TEXT,
                       title TEXT, artist TEXT, album TEXT, years INTEGER UNSIGNED NULL,
                       track INTEGER UNSIGNED NULL, trackNb INTEGER UNSIGNED NULL, genre INTEGER UNSIGNED NULL,
                       status INTEGER, frames TEXT, bitrate INTEGER, duration INTEGER);" );
    @db.execute( "create table if not exists users (
                       uid INTEGER PRIMARY KEY,
                       nickname TEXT UNIQUE,
                       hash TEXT,
                       validated INTEGER UNSIGNED, 
                       creation INTEGER);" );
    @db.execute( "create table if not exists sessions (
                       sid TEXT PRIMARY KEY,
                       sudo_uid INTEGER UNSIGNED,
                       uid INTEGER UNSIGNED,
                       user_agent TEXT,
                       remote_ip TEXT,
                       creation INTEGER,
                       validity INTEGER,
                       FOREIGN KEY(uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE,
                       FOREIGN KEY(sudo_uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);" );
    @db.execute( "create table if not exists groups ( 
                       gid INTEGER PRIMARY KEY, 
                       label TEXT );" );
    @db.execute( "create table if not exists groups_users (
                       gid INTEGER UNSIGNED,
                       uid INTEGER UNSIGNED,
                       PRIMARY KEY(gid, uid),
                       FOREIGN KEY(gid) REFERENCES groups(gid) ON UPDATE CASCADE ON DELETE CASCADE,
                       FOREIGN KEY(uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);" );

    # A right is designed like a path
    # The user that own's a root path is automatically the owner of sub pathes
    @db.execute( "create table if not exists rights (
                       rid INTEGER PRIMARY KEY,
                       right TEXT UNIQUE,
                       owner INTEGER UNSIGNED,
                       flag_owner INTEGER UNSIGNED,
                       flag_others INTEGER UNSIGNED,
                       FOREIGN KEY(owner) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);" );
    @db.execute( "create table if not exists rights_groups (
                       rid INTEGER UNSIGNED,
                       gid INTEGER UNSIGNED,
                       flag_group INTEGER UNSIGNED,
                       PRIMARY KEY(rid, gid),
                       FOREIGN KEY(rid) REFERENCES rights(rid) ON UPDATE CASCADE ON DELETE CASCADE,
                       FOREIGN KEY(gid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);" );
    # Active tokens linked to a right
    @db.execute( "create table if not exists rights_tokens (
                       rid INTEGER UNSIGNED,
                       tid INTEGER UNSIGNED,
                       PRIMARY KEY(tid, rid),
                       FOREIGN KEY(rid) REFERENCES rights(rid) ON UPDATE CASCADE ON DELETE CASCADE,
                       FOREIGN KEY(tid) REFERENCES tokens(tid) ON UPDATE CASCADE ON DELETE CASCADE);" );
    @db.execute( "create table if not exists tokens (
                       tid INTEGER PRIMARY KEY,
                       token TEXT UNIQUE,
                       rid INTEGER UNSIGNED UNIQUE,
                       activated INTEGER UNSIGNED, 
                       type INTEGER UNSIGNED,
                       FOREIGN KEY(rid) REFERENCES rights(rid)  ON UPDATE CASCADE ON DELETE CASCADE);" );
    @db.execute( "create table if not exists sessions_tokens (
                       tid INTEGER PRIMARY KEY);" );

    create_new_user("guest", "guest", 1);

    req = @db.prepare("UPDATE library SET status=#{FILE_WAIT} WHERE status=#{FILE_ENCODING_PROGRESS}");
    res = req.execute!();
    req.close();

    res;

    log("library initialized.");
  end

  def create_new_user( user, pass, validated )
    bcrypt_pass = BCrypt::Password.create(pass);
    creation = Time.now();
    req = @db.prepare("INSERT OR IGNORE INTO users (uid, nickname, hash, validated, creation) VALUES ( ?, ?, ?, ?, ? )");
    res = req.execute!( nil, user, bcrypt_pass, 1,creation.strftime("%s"));
    req.close();

  end

  def login( user, pass )
      req = @db.prepare("SELECT hash FROM users WHERE nickname='#{user}' LIMIT 1");
      res = req.execute!();
      req.close();
      return false if(res == nil or res[0] == nil)

      # http://blog.phusion.nl/2012/10/06/sha-3-extensions-for-ruby-and-node-js/
      # Use bcrypt for hashing passwords
      if( BCrypt::Password.new(res[0].at(0)) == pass )
        return true;
      end
      return false;
  end

  def invalidate_sessions( )
    #TODO       req = @db.prepare("DELETE FROM sessions WHERE validity < ")
  end

  def check_session( sid, remote_ip, user_agent )
    req = @db.prepare("SELECT U.nickname FROM sessions as S INNER JOIN users as U ON U.uid = S.uid WHERE S.sid='#{sid}' AND S.user_agent='#{user_agent}' AND S.remote_ip='#{remote_ip}'");
    res = req.execute!();
    req.close();
    return res[0].at(0) if(res[0])
    nil;
  end

  #TODO refactor use execute and mapping values
  def create_user_session(sudo_user, user, remote_ip, user_agent )
    return false if(user == nil)

    #retrieve user uid
    req = @db.prepare("SELECT uid FROM users WHERE nickname='#{user}'");
    res = req.execute!();
    req.close();
    uid = res[0].at(0);

    #retrieve sudo_user uid
    suid = uid;
    if (sudo_user != nil)
      req = @db.prepare("SELECT uid FROM users WHERE nickname='#{sudo_user}'");
      res = req.execute!();
      req.close();
      suid = res[0].at(0);
    end

    creation = (Time.now()).strftime("%s");
    #TODO constant for session validity
    validity = (Time.now() + (24*60*60)).strftime("%s"); 

    hashExists = false;
    gen_hash_retry = 0;
    char_set =  [('a'..'z'),('A'..'Z'), ('0'..'9')].map{|i| i.to_a}.flatten
    random_string=nil;
    while ( hashExists == false )
      # generates a random string
      # http://stackoverflow.com/questions/88311/how-best-to-generate-a-random-string-in-ruby
      random_string = (0...50).map{ char_set[rand(char_set.length)] }.join
      req = @db.prepare("SELECT count(*) FROM sessions WHERE sid='#{random_string}'");
      res = req.execute!();
      req.close();
      hashExists = true if( res[0].at(0) == 0)
      return nil if(gen_hash_retry >= 100)
    end

    req = @db.prepare("INSERT INTO sessions ( sid, sudo_uid, uid, user_agent, remote_ip, creation, validity ) VALUES ('#{random_string}', '#{suid}', '#{uid}', '#{user_agent}', '#{remote_ip}', #{creation}, #{validity})");
    req.execute!();
    req.close();
    
    # returns the newly session hash created
    random_string;
  end

  def check_token(token)
    # # TEMPORARY COMMENT BECAUSE WE HAVE TO IMPLEMENTS RIGHTS
    # req = @db.prepare("SELECT user FROM token WHERE token=#{token}");
    # res = req.execute!();
    # req.close();
    # return nil if(res[0] == nil);
    # res[0].at(0);
    nil;
  end

  def create_token(user, token)
    # # TEMPORARY COMMENT BECAUSE WE HAVE TO IMPLEMENTS RIGHTS
    # req = @db.prepare("INSERT OR IGNORE INTO tokens (tid, token, ) VALUES(?,?)");
    # res = req.execute!(user, token);
    # req.close();
    # req = @db.prepare("SELECT token FROM token WHERE user=?");
    # res = req.execute!(user);
    # req.close();
    # res[0].at(0);
    nil;
  end

  # searching methods here 
  def get_nb_songs()
    req = @db.prepare("SELECT COUNT (*) FROM library WHERE status=#{FILE_OK}");
    res = req.execute!();
    req.close();
    res[0].at(0);
  end
  
  def get_total(field, comparison, value)
    if(field && value.size > 0)
      if( "like" == comparison)
        req = @db.prepare("SELECT COUNT (*) FROM library WHERE status=#{FILE_OK} AND #{field} LIKE \"%\" || :name || \"%\"");
      else
        req = @db.prepare("SELECT COUNT (*) FROM library WHERE status=#{FILE_OK} AND #{field} LIKE :name");
      end
      res = req.execute!(:name => value);
    else
      req=@db.prepare("SELECT COUNT (*) FROM library WHERE status=#{FILE_OK}");
      res = req.execute!();
    end
    req.close();
    res[0].at(0);
  end
  
  def get_file(*mids)
    if(mids.size == 0 || mids[0] == nil)
      req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_OK} ORDER BY RANDOM() LIMIT 1");
      res = req.execute().map(&Song.from_db);
      req.close();
    else
      req = @db.prepare("SELECT * FROM library WHERE mid=? AND status=#{FILE_OK} LIMIT 1");
      res = mids.map { |mid|
        req.execute(mid).map(&Song.from_db).first;
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
    res.map(&Song.from_db).first
  end

  def secure_request(fieldsSelection, value, comparison, field, orderBy, firstResult, resultCount)
    field   = "artist" if(field != "title" && field != "album" && field != "genre");
    orderBy = "artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track ASC, title COLLATE NOCASE DESC" if(orderBy == nil);

    if( nil != firstResult && nil != resultCount) 
      firstResult = 0  if(!(firstResult.is_a? Integer))
      firstResult = 0  if(firstResult < 0)
    end

    if("like" == comparison)
      value = '%' + value + '%';
    end
    return request(fieldsSelection, value, field, orderBy, firstResult, resultCount); 
  end

  def request(fieldsSelection, value, field, orderBy, firstResult, resultCount)
    if( fieldsSelection )
      request  = "SELECT " + fieldsSelection + " FROM library WHERE status=#{FILE_OK} ";
    else
      request  = "SELECT * FROM library WHERE status=#{FILE_OK} ";
    end
    request << "AND #{field} LIKE  :name " if(field != nil);
    if(orderBy != nil)
      request << "ORDER BY #{orderBy} ";
    end

    if(firstResult && resultCount)
      request << "LIMIT #{firstResult},#{resultCount}";
    else 
      if(resultCount)
           request << "LIMIT #{resultCount}";
      end
    end

    #warning("Querying database : #{request}");
    begin
      req = @db.prepare(request);
      if(value != nil)
        res = req.execute(:name => value).map(&Song.from_db);
      else
        res = req.execute().map(&Song.from_db);
      end
      req.close();
    rescue => e
      error("#{e}. Query #{request}");
      res = [];
    end
    return res;
  end

  def encode_file()
    begin
      req = @db.prepare("SELECT * FROM library WHERE status=#{FILE_WAIT} LIMIT 1");
      res = req.execute().map(&Song.from_db);
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
    req = @db.prepare("SELECT mid FROM library WHERE src=?");
    res = req.execute!(src);
    req.close();
    res.size == 0;
  end

  def add(song)
    req = "INSERT INTO library (";
    v = song.to_db();
    req << v.map { |k, v|
      k
    }.join(", ");
    req << ") VALUES(";
    req << v.map { |k, v|
      ":#{k}";
    }.join(", ");
    req << ");";
    st = @db.prepare(req);
    st.execute(v);
    st.close();
  end

  def update(song)
    req = "UPDATE library SET ";
    v = song.to_db();
    req << v.map { |k, v|
      "#{k}=:#{k}";
    }.join(", ")
    req << " WHERE mid=:mid";

    st = @db.prepare(req);
    st.execute(v);
    st.close();
  end
end
