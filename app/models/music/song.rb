module Music
  class Song < ApplicationRecord
    # Shown when Deezer has no album cover for a track.
    PLACEHOLDER_IMAGE = "https://firstbenefits.org/wp-content/uploads/2017/10/placeholder-300x300.png"

    self.primary_key = :isrc

    scope :liked_songs, -> { where(is_liked: true) }
  end
end
