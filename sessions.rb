class Sessions
  def initialize()
    @lastSessionsCleanUpTime = 0;
  end

  def load(db)
    @db = db
    sql = <<SQL
    PRAGMA foreign_keys = ON;
    create table if not exists sessions (
                       sid TEXT PRIMARY KEY,
                       uid INTEGER UNSIGNED,
                       user_agent TEXT,
                       remote_ip TEXT,
                       creation INTEGER,
                       last_connexion INTEGER,
                       validity INTEGER,
                       FOREIGN KEY(uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);
SQL
    @db.execute_batch(sql);
  end

  def invalidate( )
    currentTime = Time.now()
    diff = currentTime - @lastSessionsCleanUpTime
    if(diff.to_i > 60*10) # 10min
      now = currentTime.strftime("%s");
      debug("[DB] invalidate_sessions");
      @db.execute("DELETE FROM sessions WHERE validity <= ?", now);
      @lastSessionsCleanUpTime = currentTime;
    end
  end

  def check( sid, remote_ip, user_agent )
    #TODO Change a flag in order to add a message to the response when the user try to access an invalidated session
    now = (Time.now()).strftime("%s");
    debug("[DB] check_session");
    @db.execute("SELECT U.nickname, U.uid as nick FROM sessions as S INNER JOIN users as U ON U.uid = S.uid WHERE S.sid='#{sid}' AND S.user_agent='#{user_agent}' AND remote_ip='#{remote_ip}' AND U.validated=1 AND validity > ? LIMIT 1", now) do |row|
      return row["nick"], row["uid"]
    end
    nil;
  end

  #TODO refactor use execute and mapping values
  def create(uid, remote_ip, user_agent)
    return false if(uid == nil)

    #If session already exists return the already created session
    debug("[DB] create_user_session select existing");
    @db.execute("SELECT S.sid FROM sessions as S WHERE S.uid = #{uid} AND S.user_agent='#{user_agent}' AND S.remote_ip='#{remote_ip}'") do |row|
      return row["sid"]
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
      debug("[DB] create_user_session generate check hash existence");
      res = @db.execute("SELECT count(*) as hash_exists FROM sessions WHERE sid='#{random_string}'");
      hashExists = true if( res[0] != nil and res[0]["hash_exists"] == 0)
      return nil if(gen_hash_retry >= 100)
    end

    debug("[DB] create_user_session insert");
    @db.execute("INSERT INTO sessions ( sid, uid, user_agent, remote_ip, creation, last_connexion, validity ) VALUES ('#{random_string}', '#{uid}', '#{user_agent}', '#{remote_ip}', #{creation}, #{creation}, #{validity})")

    # returns the newly session hash created
    random_string;
  end

  def updateLastConnexion(sessionID)
    debug("[DB] update_session_last_connexion");
    @db.execute("UPDATE sessions SET last_connexion=#{(Time.now()).strftime("%s")} WHERE sid='#{sessionID}';");
  end
end
