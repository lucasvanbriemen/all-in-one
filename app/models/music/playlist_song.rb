module Music
  class PlaylistSong < ApplicationRecord
    belongs_to :playlist, class_name: "Music::Playlist"
    belongs_to :song, class_name: "Music::Song"
  end
end
