#!/usr/bin/env ruby

require 'sqlite3'

class DBlite < SQLite3::Database
  def initialize(name = "jukebox.db", table = [])
    super("jukebox.db");
    @results_as_hash = true;
    table.each { |t| t.load(self) };
  end
end
