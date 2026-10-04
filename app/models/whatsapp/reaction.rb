module Whatsapp
  class Reaction < ApplicationRecord
    self.table_name = "whatsapp_reactions"

    belongs_to :sender, class_name: "Whatsapp::Contact", primary_key: :jid, foreign_key: :sender_jid, optional: true
  end
end
