module Music
  class Song < ApplicationRecord
    self.primary_key = :isrc
  end
end
