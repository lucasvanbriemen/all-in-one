module Messaging
  class Contact < ApplicationRecord
    belongs_to :account, inverse_of: :contacts

    validates :external_id, presence: true, uniqueness: { scope: :account_id }

    # Address-book name first, then whatever the contact calls themselves.
    def display_name
      name.presence || push_name.presence || verified_name.presence || phone_number
    end

    def phone_number
      external_id[/\A(\d+)@/, 1]
    end
  end
end
