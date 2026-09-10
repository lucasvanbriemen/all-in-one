class MusicChange < ActiveRecord::Migration[8.0]
  def change
    add_column :songs, :should_be_played, :boolean, default: false
  end
end
