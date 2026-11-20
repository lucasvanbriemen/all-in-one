module Github
  class Repository < ApplicationRecord
    belongs_to :organization, class_name: "Github::Organization"
  end
end
