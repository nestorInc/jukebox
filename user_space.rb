module Rights_Flag
  READ = 1
  WRITE = 2
  EXECUTE = 4
  CREATION = 8
  DELETE = 16
  TOKENIZE = 32
  OWNER = 64
end

module Tokens_Type
  LOGIN = 1
end

$right_paths = {
  "root"=>"/",
  "users"=>"users/", 
  "channels"=>"channels/",
  "groups"=>"groups/",
  "tokens"=>"tokens/"
};

