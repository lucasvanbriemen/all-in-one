class CreateMessageReactions < ActiveRecord::Migration[8.0]
  def change
    create_table :message_reactions do |t|
      t.timestamps
      t.string :message_id, null: false
      t.string :reaction
    end
  end
end
