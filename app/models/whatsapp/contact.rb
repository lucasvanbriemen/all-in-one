module Whatsapp
  class Contact < ::Contact
    def is_me
      Connection.current.my_jids.include?(id)
    end

    def display_name
      name.presence || (id.end_with?("@lid") ? nil : phone_number)
    end

    def phone_number
      "+#{id.split('@').first}"
    end
  end
end
