require 'sqlite3'

module Rights_Flag
  READ = 1
  WRITE = 2
  EXECUTE = 4
  CREATION = 8
  DELETE = 16
  TOKENIZE = 32
  OWNER = 64
end


class User
  attr_accessor :uid
  attr_accessor :nickname
  attr_accessor :hash
  attr_accessor :creation
  attr_accessor :validated

  def initialize(params = {})
    @uid = params["uid"];
    @nickname = params["nickname"];
    @hash = params["hash"];
    @creation = params["creation"];
    @validated = params["validated"];
  end

  def from_db(db)
    if(@mid)
      req = db.prepare("SELECT nickname, hash, validated, creation FROM users WHERE mid=#{@mid} LIMIT 1");
      res = req.execute!();
      req.close();
      if( res != nil and res[0] != nil )
        @nickname = res[0].at(0);
        @hash = res[0].at(1);
        @validated = res[0].at(2);
        @creation = res[0].at(3);
        return true;
      end
    end

    if(@nickname)
      req = db.prepare("SELECT uid, hash, validated, creation FROM users WHERE nickname=#{@nickname} LIMIT 1");
      res = req.execute!();
      req.close();
      if( res != nil and res[0] != nil )
        @uid = res[0].at(0);
        @hash = res[0].at(1);
        @validated = res[0].at(2);
        @creation = res[0].at(3);
        return true;
      end
    end
    return false;
  end

  def to_db(db)
    req = db.prepare("INSERT OR REPLACE INTO users ( uid, nickname, hash, validated, creation) VALUES ( NULL, '#{@nickname}', '#{hash}', #{validated},'#{creation} )");
    res= req.execute!();
    req.close();
    return true if( res != nil )
    return false;
  end
end

class Session
  attr_accessor :sid
  attr_accessor :uid
  attr_accessor :suid
  attr_accessor :user_agent
  attr_accessor :remote_ip
  attr_accessor :last_access
  attr_accessor :creation

  def initialize(params = {})
    @sid = params["sid"];
    @uid = params["uid"];
    @last_access = params["last_access"];
    @creation = params["creation"];
  end

  def from_db(db)
    if(@sid != nil)
      req = db.prepare("SELECT sudo_uid, uid, user_agent, remote_ip, creation, validity, last_access FROM sessions WHERE sid = '#{@sid}' LIMIT 1");
      res = req.execute!();
      req.close();
      if( res != nil and res[0] != nil)
        @suid = res[0].at(0);
        @uid = res[0].at(1);
        @user_agent = res[0].at(2);
        @remote_ip = res[0].at(3);
        @creation = res[0].at(4);
        @validity = res[0].at(5);
        return true;
      end
    end
    return false;
  end

  def to_db(db)
    req = db.prepare("INSERT OR REPLACE INTO sessions ( sid, sudo_uid, uid, user_agent, remote_ip, creation, validity, last_access) VALUES ( NULL, '#{@nickname}', '#{hash}', #{validated},'#{creation} )");
    res = req.execute!();
    req.close();
    return true if (res != nil)
    return false;  
  end

end

class Right
  attr_accessor :rid
  attr_accessor :path
  attr_accessor :owner
  attr_accessor :owner_flag
  attr_accessor :others_flag
  attr_accessor :groups
  attr_accessor :tokens

  def initialize(params = {})
    @rid = params["rid"];
    @path = params["path"];
    @owner = params["owner"];
    @owner_flags = params["owner_flags"];
    @groups = params["groups"];
    @groups = params["tokens"];
    @other_flags = params["other_flags"];
  end
  
  def from_db(db)
    main_loaded = false;

    if ( @rid != nil )
      req = db.prepare("SELECT right, owner, flag_owner, flag_others FROM rights WHERE rid='#{rid}'");
      res = req.execute!();
      req.close();
      
      if(res != nil and res[0] != nil)
        @path = res[0].at(0);
        @owner = res[0].at(1);
        @flag_owner = res[0].at(2);
        @flag_others = res[0].at(3);
        main_loaded = true;
      end
    end

    if( @path != nil )
      req = db.prepare("SELECT rid, owner, flag_owner, falg_others FROM rights WHERE path='#{@path}'");
      res = req.execute!();
      req.close();
      if(res != nil and res[1] != nil)
        @rid = res[0].at(0);
        @owner = res[0].at(1);
        @flag_owner = res[0].at(2);
        @flag_others = res[0].at(3);
        main_loaded = true;
      end
    end
    return false if(!main_loaded)

    req = db.prepare("SELECT gid, flag_group FROM rights_groups WHERE rid='#{rid}'");
    res = req.execute!();
    @groups = [];
    res.each{ |line|
      groups << { "gid" => line.at(0), "flag" => line.at(1)};
    }
    req.close();

    req = db.prepare("SELECT tid FROM tokens WHERE rid='#{rid}'");
    res = req.execute!();
    @tokens = [];
    res.each{ |line|
      tokens << { "tid" => line.at(0) };
    }
    req.close();
    return true;
  end

  def to_db(db)
    req = db.prepare("INSERT INTO rights (rid, right, owner, flag_owner, flag_others) VALUES (NULL, '#{@right}', '#{@owner}', #{@flag_owner}, #{@flag_others} )");
    res = req.execute!();
    req.close();

    #TODO INSERT into rights groups and rights tokens

    return true if(res)
    return false;
  end
end

class Token
  attr_accessor :tid
  attr_accessor :rid
  attr_accessor :creation
  attr_accessor :user_activation

  def initialize(params = {})
    @tid = params["tid"];
    @token = params["token"];
    @rid = params["rid"];
    @activated = params["activated"];
    @type = params["type"];
    @parameters = params["params"];
  end

  def from_db(db)
    if(@tid)
      req = db.prepare("SELECT * FROM tokens where tid = '#{@tid}' LIMIT 1");
      res = req.execute!();
      req.close();
      return true;
    end
    return false;
  end

  def to_db(db)
    req = db
  end
end
