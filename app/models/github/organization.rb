module Github
  class Organization < ApplicationRecord
    has_many :repositories, class_name: "Github::Repository"
  end
end
