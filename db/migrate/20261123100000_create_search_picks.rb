class CreateSearchPicks < ActiveRecord::Migration[8.0]
  # One row per result opened from Cmd+K: what was typed and what was picked.
  # Search boosts results picked before for a similar query, and an empty
  # search lists the most recent picks (from the saved `result`).
  def change
    create_table :search_picks do |t|
      t.string :query, null: false
      t.string :source, null: false
      t.json :result, null: false
      t.timestamps
    end
    add_index :search_picks, :created_at
  end
end
