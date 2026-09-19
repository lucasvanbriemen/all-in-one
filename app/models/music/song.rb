module Music
  class Song < ApplicationRecord
    has_many :plays, foreign_key: :song_isrc, primary_key: :isrc

    PLACEHOLDER_IMAGE = "https://firstbenefits.org/wp-content/uploads/2017/10/placeholder-300x300.png"

    self.primary_key = :isrc

    scope :liked_songs, -> { where(is_liked: true) }

    def toggle_favorite!
      update!(is_liked: !is_liked)
    end
  end
end
