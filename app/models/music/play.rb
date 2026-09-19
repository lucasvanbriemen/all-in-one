module Music
  class Play < ApplicationRecord
    belongs_to :song, foreign_key: :song_isrc, primary_key: :isrc, class_name: "Music::Song"
  end
end
