require "sqlite3"

class Users
  def initialize()
    @lastSessionsCleanUpTime = 0;

    @db = SQLite3::Database.new("jukebox_user.db");
    @db.results_as_hash = true;

    init_db();
    init_root();

    create_new_user("guest", "guest", 1);

    debug("[DB] initialize");

    log("library initialized.");
  end


  def init_db()
    sql = <<SQL
    PRAGMA foreign_keys = ON;
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
    debug("[DB] init_db");
    @db.execute_batch( sql );
  end

  def init_root()
    # todo check if root exists
    debug("[DB] init_root 1/2");
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
      debug("[DB] init_root 2/2");
      @db.execute_batch( sql );
    rescue => e
      error("Create root user : #{e}");
    end
  end

  def create_new_user( user, pass, validated )
    bcrypt_pass = BCrypt::Password.create(pass);
    creation = Time.now();

    debug("[DB] create_new_user 1/3");
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
      debug("[DB] create_new_user 2/3");
      @db.execute_batch( sql );
    rescue =>e
      error("Create user : #{e}");
    end

    create_login_token( user );

    debug("[DB] create_new_user 3/3");
    @db.execute("SELECT uid FROM users WHERE nickname='#{user}' LIMIT 1") do |row|
      return row["uid"];
    end
    nil;
  end

  def create_login_token( userNickname )
    debug("[DB] create_login_token check");
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
      debug("[DB] create_login_token retry check");
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
      debug("[DB] create_login_token insert");
      @db.execute_batch( sql );
    rescue => e
      error("#{e}");
    end  
  end

  def login( user, pass )
      req = @db.prepare("SELECT hash FROM users WHERE nickname='#{user}'AND validated = 1  LIMIT 1");
      debug("[DB] login");
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
    currentTime = Time.now()
    diff = currentTime - @lastSessionsCleanUpTime
    if(diff.to_i > 60*10) # 10min
      now = currentTime.strftime("%s");
      debug("[DB] invalidate_sessions");
      @db.execute("DELETE FROM sessions WHERE validity <= ?", now);
      @lastSessionsCleanUpTime = currentTime;
    end
  end

  def check_session( sid, remote_ip, user_agent )
    #TODO Change a flag in order to add a message to the response when the user try to access an invalidated session
    now = (Time.now()).strftime("%s");
    debug("[DB] check_session");
    @db.execute("SELECT U.nickname as nick FROM sessions as S INNER JOIN users as U ON U.uid = S.uid WHERE S.sid='#{sid}' AND S.user_agent='#{user_agent}' AND remote_ip='#{remote_ip}' AND U.validated=1 AND validity > ? LIMIT 1", now) do |row|
      return row["nick"]
    end
    nil;
  end

  #TODO refactor use execute and mapping values
  def create_user_session( user, remote_ip, user_agent )
    return false if(user == nil)

    #If session already exists return the already created session
    debug("[DB] create_user_session select existing");
    @db.execute("SELECT S.sid FROM sessions as S INNER JOIN users as U ON U.uid = S.uid WHERE u.nickname='#{user}' AND S.user_agent='#{user_agent}' AND remote_ip='#{remote_ip}' AND U.validated=1 LIMIT 1") do |row|
      return row["sid"]
    end

    #retrieve user uid
    uid = nil;
    debug("[DB] create_user_session retrieve user uid");
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
      debug("[DB] create_user_session generate check hash existence");
      res = @db.execute("SELECT count(*) as hash_exists FROM sessions WHERE sid='#{random_string}'");
      hashExists = true if( res[0] != nil and res[0]["hash_exists"] == 0)
      return nil if(gen_hash_retry >= 100)
    end

    debug("[DB] create_user_session insert");
    @db.execute("INSERT INTO sessions ( sid, uid, user_agent, remote_ip, creation, last_connexion, validity ) VALUES ('#{random_string}', '#{uid}', '#{user_agent}', '#{remote_ip}', #{creation}, #{creation}, #{validity})")

    # Wtf why this line doesn't work ?
    # @db.execute("INSERT INTO sessions ( sid, sudo_uid, uid, user_agent, remote_ip, creation, last_connexion, validity ) VALUES (?,?,?,?,?,?,?,?)", random_string, suid, uid, user_agent, remote_ip, creation, creation, validity);

    # returns the newly session hash created
    random_string;
  end

  def update_session_last_connexion(sessionID)
    debug("[DB] update_session_last_connexion");
    @db.execute("UPDATE sessions SET last_connexion=#{(Time.now()).strftime("%s")} WHERE sid='#{sessionID}';");
  end

  def create_new_group( label )
    debug("[DB] create_new_group");
    @db.execute("INSERT INTO groups (gid, label) VALUES (?,?)", nil, label);
    @db.last_insert_row_id;
  end

  def create_new_right( right_path, owner_id, flag_owner, flag_others, group_rights)
    #TODO check if subrights exists
    #TODO check user has right to create a new sub right
    debug("[DB] create_new_right 1/2");
    @db.execute("INSERT OR IGNORE INTO rights (right, owner, flag_owner, flag_others) VALUES( '#{right_path}', '#{owner_id}', #{flag_owner}, #{flag_others})");

    begin
      debug("[DB] create_new_right 2/2");
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
    debug("[DB] get_user_informations");
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
    debug("[DB] change_user_password select");
    @db.execute("SELECT " +
                " U.right " +
                "FROM users as U " +
                "WHERE U.nickname = '#{nickname}' " +
                "LIMIT 1") do |row|
      if user_has_right(user, row["right"], Rights_Flag::WRITE ) 
        debug("[DB] change_user_password update");
        @db.execute("UPDATE users SET hash='#{BCrypt::Password.create(new_pass)}' WHERE nickname='#{nickname}'")
        return true
      end
    end
    false
  end

  def check_login_token(user, token)
    debug("[DB] check_login_token");
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
      debug("[DB] get_user_login_token");
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
      debug("[DB] get_login_token_session");
      sid = @db.execute("SELECT LT.sid FROM login_tokens as LT INNER JOIN tokens as T ON T.tid = LT.tid WHERE T.token='#{token}' LIMIT 1")[0]["sid"]
    rescue => e
      error("get_login_token_sessions #{e}")
      sid = nil
    end
    sid
  end

  def update_login_token_session(token, sid)
    begin
      debug("[DB] update_login_token_session");
      @db.execute("UPDATE login_tokens SET sid='#{sid}' WHERE tid='#{token}'")
      sid
    rescue => e
      errror("update_token_session : #{e}")
      nil
    end
  end


  def user_has_right(user, right, askedMode )
    begin
      debug("[DB] user_has_right 1/2");
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
      debug("[DB] user_has_right 2/2");
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
      debug("[DB] user_is_owner 1/2");
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
        debug("[DB] user_is_owner 2/2");
        res = @db.execute(req)
      rescue => e
        return false
      end

      return true if(res[0])
      currentIndex = currentIndex + 1
    end
    false;
  end
end
