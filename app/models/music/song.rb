module Music
  class Song < ApplicationRecord
    self.primary_key = :isrc

    scope :liked_songs, -> { where(is_liked: true) }
  end
end
