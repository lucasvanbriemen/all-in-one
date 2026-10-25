class CreateMessageReactions < ActiveRecord::Migration[8.0]
  def change
    create_table :message_reactions do |t|
      t.timestamps
      t.references :message, null: false, foreign_key: true
      t.string :reaction
    end
  end
end
