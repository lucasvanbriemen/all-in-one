class AddIsLikedToSongs < ActiveRecord::Migration[8.0]
  def change
    add_column :songs, :is_liked, :boolean, default: false, null: false
  end
end
