module Plugable
  def extend mod
    @ancestors ||= {}
    return if @ancestors[mod]
    mod_clone = mod.clone
    @ancestors[mod] = mod_clone
    super mod_clone
  end

  def remove mod
    mod_clone = @ancestors[mod]
    mod_clone.instance_methods(false).each {|m|
      mod_clone.module_eval { remove_method m }
    }
    @ancestors[mod] = nil
  end
end
