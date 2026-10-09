module Whatsapp
  class Contact < ApplicationRecord
    self.table_name = "whatsapp_contacts"

    def display_name
      name.presence || verified_name.presence || push_name.presence || (jid.end_with?("@lid") ? nil : phone_number)
    end

    def phone_number
      "+#{jid.split('@').first}"
    end
  end
end
