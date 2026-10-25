class AddContactIdToReactions < ActiveRecord::Migration[8.0]
  def change
    add_reference :message_reactions, :contact, type: :string, index: false, foreign_key: true
  end
end
