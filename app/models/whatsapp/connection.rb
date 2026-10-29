module Whatsapp
  class Connection < ApplicationRecord
    self.table_name = "whatsapp_connections"

    def self.current
      first_or_create!
    end

    def open?
      status == "open"
    end

    def my_jids
      [ me_jid, me_lid ].compact
    end
  end
end
