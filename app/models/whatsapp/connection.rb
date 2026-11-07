module Whatsapp
  class Connection < ApplicationRecord
    self.table_name = "whatsapp_connections"

    def self.current
      first_or_create!
    end

    # Read once per request or job (Current resets in between) rather than once
    # per chat when a list of them works out which one is "You".
    def self.me_jid
      Current.whatsapp_me_jid ||= current.me_jid
    end

    def open?
      status == "open"
    end

    def my_jids
      [ me_jid, me_lid ].compact
    end
  end
end
