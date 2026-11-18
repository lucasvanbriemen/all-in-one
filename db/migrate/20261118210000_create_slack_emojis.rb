class CreateSlackEmojis < ActiveRecord::Migration[8.0]
  # The workspace's custom emoji (:party_parrot:, :wof:), synced from Slack's emoji.list.
  def change
    create_table :slack_emojis, id: false do |t|
      t.string :name, null: false, primary_key: true
      t.string :url, null: false
      t.timestamps
    end
  end
end
