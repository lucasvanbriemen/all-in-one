module Music
  class Play < ApplicationRecord
    belongs_to :song, class_name: "Music::Song"
  end
end
