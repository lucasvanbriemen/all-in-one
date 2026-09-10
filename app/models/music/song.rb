module Music
  class Song < ApplicationRecord
    self.primary_key = :isrc

    scope :should_be_played, -> { where(should_be_played: true) }
  end
end
