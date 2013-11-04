#!/usr/bin/env ruby

require 'sqlite3'

require 'display.rb'
require 'user_space.rb'

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
    @db = SQLite3::Database.new("jukebox.db");
    @db.results_as_hash = true;
    init_db();
    init_root();

    create_new_user("guest", "guest", 1);

    req = @db.prepare("UPDATE library SET status=#{FILE_WAIT} WHERE status=#{FILE_ENCODING_PROGRESS}");
    res = req.execute!();
    req.close();

    res;

    log("library initialized.");
  end

  def init_db()
    # Activate the use of foreign keys contraints for sqlite 3
    sql = <<SQL
    PRAGMA foreign_keys = ON;
    create table if not exists library (
                       mid INTEGER PRIMARY KEY,
                       src TEXT, dst TEXT,
                       title TEXT, artist TEXT, album TEXT, years INTEGER UNSIGNED NULL,
                       track INTEGER UNSIGNED NULL, trackNb INTEGER UNSIGNED NULL, genre INTEGER UNSIGNED NULL,
                       status INTEGER, frames TEXT, bitrate INTEGER, duration INTEGER);
    create table if not exists users (
                       uid INTEGER PRIMARY KEY,
                       nickname TEXT UNIQUE,
                       hash TEXT,
                       right,
                       validated INTEGER UNSIGNED,
                       creation INTEGER);
    create table if not exists sessions (
                       sid TEXT PRIMARY KEY,
                       uid INTEGER UNSIGNED,
                       user_agent TEXT,
                       remote_ip TEXT,
                       creation INTEGER,
                       last_connexion INTEGER,
                       validity INTEGER,
                       FOREIGN KEY(uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);
    create table if not exists groups (
                       gid TEXT PRIMARY KEY,
                       label TEXT );
    create table if not exists groups_users (
                       gid TEXT,
                       uid INTEGER UNSIGNED,
                       PRIMARY KEY(gid, uid),
                       FOREIGN KEY(gid) REFERENCES groups(gid) ON UPDATE CASCADE ON DELETE CASCADE,
                       FOREIGN KEY(uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);
    create table if not exists rights (
                       right TEXT UNIQUE,
                       owner INTEGER UNSIGNED,
                       flag_owner INTEGER UNSIGNED,
                       flag_others INTEGER UNSIGNED,
                       FOREIGN KEY(owner) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);
    create table if not exists rights_groups (
                       right INTEGER UNSIGNED,
                       gid TEXT,
                       flag_group INTEGER UNSIGNED,
                       PRIMARY KEY(right, gid),
                       FOREIGN KEY(right) REFERENCES rights(right) ON UPDATE CASCADE ON DELETE CASCADE,
                       FOREIGN KEY(gid) REFERENCES groups(gid) ON UPDATE CASCADE ON DELETE CASCADE);
    create table if not exists tokens (
                       tid INTEGER PRIMARY KEY,
                       token TEXT UNIQUE,
                       right INTEGER UNSIGNED UNIQUE,
                       activated INTEGER UNSIGNED,
                       type INTEGER UNSIGNED,
                       FOREIGN KEY(right) REFERENCES rights(right) ON UPDATE CASCADE ON DELETE CASCADE);
    create table if not exists login_tokens (
                       tid INTEGER PRIMARY KEY,
                       uid INTEGER, 
                       sid INTEGER,
                       FOREIGN KEY(uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE,
                       FOREIGN KEY(tid) REFERENCES tokens(tid) ON UPDATE CASCADE ON DELETE CASCADE);
SQL

    @db.execute_batch( sql );
  end

  def init_root()
    # todo check if root exists
    @db.execute("SELECT uid FROM users WHERE nickname='root' LIMIT 1") do |row|
      return nil;
    end

    # Generates a random password for root
    char_set =  [('a'..'z'),('A'..'Z'), ('0'..'9')].map{|i| i.to_a}.flatten
    random_string = (0...50).map{ char_set[rand(char_set.length)] }.join
    log("root password : #{random_string}");

    bcrypt_pass = BCrypt::Password.create(random_string);
    creation = Time.now();

    sql = <<SQL
     BEGIN;
     INSERT OR IGNORE INTO users (uid, right, nickname, hash, validated, creation) VALUES (NULL, '#{$right_paths["root"]}#{$right_paths["users"]}root', 'root', '#{bcrypt_pass}', 1, #{creation.strftime("%s")});

     INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others )
     SELECT 
        '#{$right_paths["root"]}', 
        U.uid, 
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER }, 
        0
     FROM users as U
     WHERE U.nickname = 'root';

     INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others ) 
     SELECT 
        '#{$right_paths["root"]}#{$right_paths["users"]}', 
        U.uid, 
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER }, 
        0
     FROM users as U
     WHERE U.nickname = 'root';

     INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others ) 
     SELECT 
        '#{$right_paths["root"]}#{$right_paths["channels"]}', 
        U.uid, 
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER }, 
        0
     FROM users as U
     WHERE U.nickname = 'root';

     INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others )      
     SELECT 
        '#{$right_paths["root"]}#{$right_paths["groups"]}', 
        U.uid, 
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER }, 
        0
     FROM users as U
     WHERE U.nickname = 'root';

     INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others ) 
     SELECT 
        '#{$right_paths["root"]}#{$right_paths["users"]}root/', 
        U.uid, 
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER }, 
        0
     FROM users as U
     WHERE U.nickname = 'root';

     INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others ) 
     SELECT 
        '#{$right_paths["root"]}#{$right_paths["groups"]}root', 
        U.uid, 
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER }, 
        0
     FROM users as U
     WHERE U.nickname = 'root';

     INSERT OR IGNORE INTO groups (gid, label) VALUES ("#{$right_paths["root"]}#{$right_paths["groups"]}root", "root");
     INSERT OR IGNORE INTO groups_users (gid, uid) 
     SELECT 
        '#{$right_paths["root"]}#{$right_paths["groups"]}root', 
        U.uid 
     FROM users AS U
     WHERE nickname="root";
     INSERT OR REPLACE INTO rights_groups (right, gid, flag_group) VALUES ("#{$right_paths["root"]}#{$right_paths["users"]}root/", "#{$right_paths["root"]}#{$right_paths["groups"]}root", #{Rights_Flag::OWNER});
     COMMIT;
SQL
    begin
      @db.execute_batch( sql );
    rescue => e
      error("Create root user : #{e}");
    end  
  end

  def validate_user( user )
    #Todo check if user session has rights to validate
    sql = <<SQL
    UPDATE users
    SET validated = 1
    WHERE nickname="#{user}"
SQL
    begin 
      @db.execute_batch( sql );
    rescue =>e
      error("Validate user : #{e}");
    end
  end

  def create_new_user( user, pass, validated )
    bcrypt_pass = BCrypt::Password.create(pass);
    creation = Time.now();

    @db.execute("SELECT uid FROM users WHERE nickname='#{user}'") do |row|
      error("Could not create User #{user}, already exists in base");
      return nil;
    end

    sql = <<SQL
      BEGIN;

      INSERT OR IGNORE INTO users (uid, right, nickname, hash, validated, creation) 
      VALUES 
      (NULL, '#{$right_paths["root"]}#{$right_paths["users"]}#{user}/', '#{user}', '#{bcrypt_pass}', #{validated}, #{creation.strftime("%s")});

      INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others )
      SELECT
        '#{$right_paths["root"]}#{$right_paths["users"]}#{user}/',
        U.uid,
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER },
        0
      FROM users as U
      WHERE U.nickname = '#{user}'; 

      INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others )
      SELECT
        '#{$right_paths["root"]}#{$right_paths["users"]}#{user}/#{$right_paths["tokens"]}',
        U.uid,
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER },
        0
      FROM users as U
      WHERE U.nickname = '#{user}'; 


      INSERT OR REPLACE INTO rights (right, owner, flag_owner, flag_others )
      SELECT
        '#{$right_paths["root"]}#{$right_paths["channels"]}#{user}/',
        U.uid,
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER },
        #{ Rights_Flag::READ }
      FROM users as U
      WHERE U.nickname = '#{user}';

      INSERT OR IGNORE INTO groups (gid, label) 
      VALUES ("#{$right_paths["root"]}#{$right_paths["groups"]}#{user}", "#{user}");

      INSERT OR IGNORE INTO groups_users (gid, uid)
      SELECT
        '#{$right_paths["root"]}#{$right_paths["groups"]}#{user}',
        U.uid
      FROM users as U
      WHERE U.nickname = '#{user}';

      INSERT OR REPLACE INTO rights_groups (right, gid, flag_group) 
      VALUES ("#{$right_paths["root"]}#{$right_paths["users"]}#{user}/", "#{$right_paths["root"]}#{$right_paths["groups"]}#{user}", #{Rights_Flag::READ | Rights_Flag::WRITE});

      COMMIT;
SQL
    begin 
      @db.execute_batch( sql );
    rescue =>e
      error("Create user : #{e}");
    end

    create_login_token( user );

    @db.execute("SELECT uid FROM users WHERE nickname='#{user}' LIMIT 1") do |row|
      return row["uid"];
    end
    nil;
  end

  def create_login_token( userNickname )
    @db.execute("SELECT lt.tid as hash_exists FROM login_tokens lt INNER JOIN users as u ON u.uid=lt.uid WHERE u.nickname='#{userNickname}'") do |row|
      error("Could not create login token, already exists")
      return nil
    end

    hashExists = false;
    gen_hash_retry = 0;
    char_set =  [('a'..'z'),('A'..'Z'), ('0'..'9')].map{|i| i.to_a}.flatten
    random_string=nil;
    while ( hashExists == false )
      random_string = (0...6).map{ char_set[rand(char_set.length)] }.join
      res = @db.execute("SELECT count(*) as hash_exists FROM tokens WHERE token='#{random_string}'");
      hashExists = true if( res[0] != nil and res[0]["hash_exists"] == 0)
      return nil if(gen_hash_retry >= 100)
    end

    #TODO check if user exists

    sql = <<SQL
     BEGIN;

     INSERT OR IGNORE INTO rights (right, owner, flag_owner, flag_others )
     SELECT 
        '#{$right_paths["root"]}#{$right_paths["users"]}#{userNickname}/#{$right_paths["tokens"]}#{random_string}', 
        U.uid,
        #{ Rights_Flag::READ | Rights_Flag::WRITE | Rights_Flag::EXECUTE | Rights_Flag::CREATION | Rights_Flag::DELETE | Rights_Flag::TOKENIZE | Rights_Flag::OWNER },
        #{ Rights_Flag::READ | Rights_Flag::EXECUTE }
     FROM users as U
     WHERE U.nickname = '#{userNickname}';

     INSERT OR IGNORE INTO tokens (tid, token, right, activated, type) 
     VALUES (NULL, '#{random_string}', '#{$right_paths["root"]}#{$right_paths["users"]}#{userNickname}/#{$right_paths["tokens"]}#{random_string}', 0, #{Tokens_Type::LOGIN});

     INSERT OR IGNORE INTO login_tokens ( tid, uid, sid )
     SELECT 
        T.tid,
        U.uid,
        NULL
     FROM users as U, tokens as T
     WHERE U.nickname = '#{userNickname}'
     AND T.token = '#{random_string}';
 
     COMMIT;
SQL
    begin
      @db.execute_batch( sql );
    rescue => e
      error("#{e}");
    end  
  end

  def login( user, pass )
      req = @db.prepare("SELECT hash FROM users WHERE nickname='#{user}'AND validated = 1  LIMIT 1");
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
    #TODO Change a flag in order to add a message to the response when the user try to access an invalidated session
    now = (Time.now()).strftime("%s");
    @db.execute("DELETE FROM sessions WHERE validity <= ?", now);
  end

  def check_session( sid, remote_ip, user_agent )
    @db.execute("SELECT U.nickname as nick FROM sessions as S INNER JOIN users as U ON U.uid = S.uid WHERE S.sid='#{sid}' AND S.user_agent='#{user_agent}' AND remote_ip='#{remote_ip}' AND U.validated=1 LIMIT 1") do |row|
      update_session_last_connexion(sid)
      return row["nick"]
    end
    nil;
  end

  #TODO refactor use execute and mapping values
  def create_user_session( user, remote_ip, user_agent )
    return false if(user == nil)

    #If session already exists return the already created session
    @db.execute("SELECT S.sid FROM sessions as S INNER JOIN users as U ON U.uid = S.uid WHERE u.nickname='#{user}' AND S.user_agent='#{user_agent}' AND remote_ip='#{remote_ip}' AND U.validated=1 LIMIT 1") do |row|
      return row["sid"]
    end

    #retrieve user uid
    uid = nil;
    res = @db.execute("SELECT uid FROM users WHERE nickname='#{user}'");
    uid = res[0]["uid"] if(res[0] != nil);

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
      res = @db.execute("SELECT count(*) as hash_exists FROM sessions WHERE sid='#{random_string}'");
      hashExists = true if( res[0] != nil and res[0]["hash_exists"] == 0)
      return nil if(gen_hash_retry >= 100)
    end

    @db.execute("INSERT INTO sessions ( sid, uid, user_agent, remote_ip, creation, last_connexion, validity ) VALUES ('#{random_string}', '#{uid}', '#{user_agent}', '#{remote_ip}', #{creation}, #{creation}, #{validity})")

    # Wtf why this line doesn't work ?
    # @db.execute("INSERT INTO sessions ( sid, sudo_uid, uid, user_agent, remote_ip, creation, last_connexion, validity ) VALUES (?,?,?,?,?,?,?,?)", random_string, suid, uid, user_agent, remote_ip, creation, creation, validity);

    # returns the newly session hash created
    random_string;
  end

  def update_session_last_connexion(sessionID)
    @db.execute("UPDATE sessions SET last_connexion=#{(Time.now()).strftime("%s")} WHERE sid='#{sessionID}';");
  end

  def create_new_group( label )
    @db.execute("INSERT INTO groups (gid, label) VALUES (?,?)", nil, label);
    @db.last_insert_row_id;
  end

  def create_new_right( right_path, owner_id, flag_owner, flag_others, group_rights)
    #TODO check if subrights exists
    #TODO check user has right to create a new sub right
    @db.execute("INSERT OR IGNORE INTO rights (right, owner, flag_owner, flag_others) VALUES( '#{right_path}', '#{owner_id}', #{flag_owner}, #{flag_others})");

    begin
      @db.prepare("INSERT OR IGNORE INTO rights_groups (right, gid, flag_group) VALUES ( ?, ?, ? )") do |stmt|
        group_rights.each { |grp|
          stmt.bind_param(1, right_path);
          stmt.bind_param(2, grp["gid"]);
          stmt.bind_param(3, grp["flag"]);
          stmt.execute();
        }
      end
    rescue => e
      #ignore statment
    end
  end

  def get_user_informations( sid )
    @db.execute("SELECT " +
                " T.token, " +
                " U.right, " +
                " S.user_agent, " +
                " S.remote_ip " +
                "FROM users as U " +
                "INNER JOIN sessions as S " +
                "ON S.uid = U.uid " +
                "INNER JOIN login_tokens as LT " +
                "ON lt.uid = S.uid " +
                "INNER JOIN tokens as T " +
                "ON T.tid = LT.tid " +
                "WHERE S.sid = '#{sid}' " +
                "LIMIT 1") do |row|
      return row
    end
    nil
  end

  def change_user_password(user, sid, nickname, old_pass, new_pass, new_pass2)
    return nil if( new_pass != new_pass2)
    return nil if( not login( nickname, old_pass ))
    @db.execute("SELECT " +
                " U.right " +
                "FROM users as U " +
                "WHERE U.nickname = '#{nickname}' " +
                "LIMIT 1") do |row|
      if user_has_right(user, row["right"], Rights_Flag::WRITE ) 
        @db.execute("UPDATE users SET hash='#{BCrypt::Password.create(new_pass)}' WHERE nickname='#{nickname}'")
        return true
      end
    end
    false
  end

  def check_login_token(user, token)
    @db.execute("SELECT " +
                " U.nickname, " +
                " T.right " +
                "FROM tokens as T " +
                "INNER JOIN login_tokens as LT " +
                "ON LT.tid = T.tid " +
                "INNER JOIN rights as R " +
                "ON R.right = T.right " +
                "INNER JOIN users as U " +
                "ON LT.uid = U.uid " +
                "WHERE T.token='#{token}' LIMIT 1") do |row|
      if user_has_right(user, row["right"], Rights_Flag::EXECUTE ) 
          return row["nickname"]
      end
    end
    nil
  end

  def get_user_login_token(user)
    begin
      @db.execute("SELECT T.token FROM login_tokens as LT INNER JOIN tokens as T ON T.tid = LT.tid INNER JOIN users as U on U.uid = LT.uid WHERE U.nickname='#{user}' LIMIT 1") do |row|
        return row["token"]
      end
    rescue => e
      error("Could not execute get_user_login_token : #{e}")
      return nil
    end
    nil
  end

  def get_login_token_session(token)
    begin
      sid = @db.execute("SELECT LT.sid FROM login_tokens as LT INNER JOIN tokens as T ON T.tid = LT.tid WHERE T.token='#{token}' LIMIT 1")[0]["sid"]
    rescue => e
      error("get_login_token_sessions #{e}")
      sid = nil
    end
    sid
  end

  def update_login_token_session(token, sid)
    begin
      @db.execute("UPDATE login_tokens SET sid='#{sid}' WHERE tid='#{token}'")
      sid
    rescue => e
      errror("update_token_session : #{e}")
      nil
    end
  end


  def user_has_right(user, right, askedMode )
    begin
      userId = @db.execute("SELECT u.uid FROM users as U WHERE U.nickname='#{user}' LIMIT 1")[0]["uid"]
    rescue => e
      userId = -1
    end 

    # @TODO flag_other isn't well treated : user must not be right owner or group for other flag
    req = "SELECT 1 FROM rights as R " +
      "LEFT JOIN rights_groups AS RG " +
      "ON RG.right = R.right " +
      "LEFT JOIN groups AS G " +
      "ON G.gid = RG.gid " +
      "LEFT JOIN groups_users AS GU " +
      "ON GU.gid = G.gid " +
      "WHERE R.right ='#{right}' " +
      "AND ( " +
      "     ( R.owner='#{userId}' ) " +
      "  OR ( RG.flag_group & #{askedMode} = #{askedMode} AND GU.uid='#{userId}') " +
      "  OR ( R.flag_others & #{askedMode} = #{askedMode} )) " + 
      "LIMIT 1";
    begin
      res = @db.execute(req)[0]
    rescue => e
      error("user_has_right error => #{e}")
      return false
    end

    return true if(res)
    return true if user_is_owner(user, right)
    false;
  end

  def user_is_owner(user, right)
    begin
      userId = @db.execute("SELECT u.uid FROM users as U WHERE U.nickname='#{user}' LIMIT 1")[0]["uid"]
    rescue => e
      userId = -1
    end 

    #Split path in order to search for each parents if the user is the owner
    splitedPath = right.split("/")
    currentIndex = 0;
    while ( currentIndex < splitedPath.length)
      currentPath = splitedPath[0..currentIndex].join("/");
      if currentIndex == (splitedPath.length-1) and right[right.length-1] == "/"
        currentPath = currentPath + "/";
      elsif currentIndex != (splitedPath.length-1)
        currentPath = currentPath + "/";
      end

      req = "SELECT 1 FROM rights as R " +
        "LEFT JOIN rights_groups AS RG " +
        "ON RG.right = R.right " +
        "LEFT JOIN groups AS G " +
        "ON G.gid = RG.gid " +
        "LEFT JOIN groups_users AS GU " +
        "ON GU.gid = G.gid " +
        "WHERE R.right ='#{currentPath}' " +
        "AND ( " +
        "     ( R.owner='#{userId}' ) " +
        "  OR ( RG.flag_group >= #{Rights_Flag::OWNER} AND GU.uid='#{userId}' )  " +
        "  OR ( R.flag_others >= #{Rights_Flag::OWNER} ))";
      begin
        res = @db.execute(req)
      rescue => e
        return false
      end

      return true if(res[0])
      currentIndex = currentIndex + 1
    end
    false;
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
