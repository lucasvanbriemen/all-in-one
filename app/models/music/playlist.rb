module Music
  # Owned by the other music app; only read here.
  class Playlist < ApplicationRecord
    has_many :playlist_songs, class_name: "Music::PlaylistSong"
    has_many :songs, through: :playlist_songs
  end
end
