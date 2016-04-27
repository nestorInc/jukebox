require 'sqlite3'

class Session
  def initialize(row)
    @sid             = row["sid"];
    @uid             = row["uid"];
    @user_agent      = row["user_agent"];
    @remote_ip       = row["remote_ip"];
    @creation        = row["creation"];
    @last_connection = row["last_connection"];
    @validity        = row["validity"];
  end

  def Session.create(sid, uid, user_agent, ip, creation, last_connection, validity)
    row = {
      "sid"             => sid,
      "uid"             => uid,
      "user_agent"      => user_agent,
      "remote_ip"       => ip,
      "creation"        => creation,
      "last_connection" => last_connection,
      "validity"        => validity }
    Session.new(row)
  end

  attr_accessor :sid
  attr_accessor :uid
  attr_accessor :user_agent
  attr_accessor :remote_ip
  attr_accessor :creation
  attr_accessor :last_connection
  attr_accessor :validity
end

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
                       last_connection INTEGER,
                       validity INTEGER,
                       FOREIGN KEY(uid) REFERENCES users(uid) ON UPDATE CASCADE ON DELETE CASCADE);
SQL
    @db.execute_batch(sql);
  end

  def get(uid, remote_ip, user_agent)
    @db.execute("SELECT * FROM sessions WHERE uid='#{uid}' AND user_agent='#{user_agent}' AND remote_ip='#{remote_ip}' LIMIT 1") do |row|
      return Session.new(row)
    end
    nil;
  end

  def insert(s)
    @db.execute("INSERT INTO sessions (sid, uid, user_agent, remote_ip, creation, last_connection, validity) VALUES ('#{s.sid}', '#{s.uid}', '#{s.user_agent}', '#{s.remote_ip}', #{s.creation}, #{s.creation}, #{s.validity})")
  end

  def purge()
    currentTime = Time.now()
    diff = currentTime - @lastSessionsCleanUpTime
    if(diff.to_i > 60 * 10) # 10min
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

    @db.execute("SELECT uid FROM sessions WHERE sid='#{sid}' AND user_agent='#{user_agent}' AND remote_ip='#{remote_ip}' AND VALIDITY > ? LIMIT 1", now) do |row|
      return row["uid"]
    end
    nil;
  end

  #TODO refactor use execute and mapping values
  def create(uid, remote_ip, user_agent)
    return false if(uid == nil)

    s = get(uid, remote_ip, user_agent)
    return s if(s)

    now = Time.now()

    creation = now.strftime("%s");
    #TODO constant for session validity
    validity = (now + (24*60*60)).strftime("%s");

    r = Random.new();
    hash = [ r.bytes(32) ].pack("m").strip

    s = Session.create(hash, uid, user_agent, remote_ip, creation, creation, validity);
    insert(s)

    s
  end

  def updateLastConnexion(s)
    debug("[DB] update_session_last_connection");
    @db.execute("UPDATE sessions SET last_connection=#{(Time.now()).strftime("%s")} WHERE sid='#{s.sid}';");
  end
end
