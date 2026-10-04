module Whatsapp
  class Connection < ApplicationRecord
    self.table_name = "whatsapp_connections"

    def self.current
      first_or_create!
    end

    def open?
      status == "open"
    end
  end
end
