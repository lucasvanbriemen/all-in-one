class Contact < ApplicationRecord
  MY_CONTACT_IDS = [ "U07HGB0EV2P" ].freeze

  def is_me
    MY_CONTACT_IDS.include?(self.id)
  end

  def display_name
    name
  end
end
