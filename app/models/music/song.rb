module Music
  # Keyed by YouTube video id.
  class Song < ApplicationRecord
    has_many :plays

    PLACEHOLDER_IMAGE = "https://firstbenefits.org/wp-content/uploads/2017/10/placeholder-300x300.png"

    scope :liked_songs, -> { where(is_liked: true) }

    def toggle_favorite!
      update!(is_liked: !is_liked)
    end
  end
end
