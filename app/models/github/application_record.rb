module Github
  # Lives in the GitHub GUI project's database, which that project owns.
  class ApplicationRecord < ActiveRecord::Base
    self.abstract_class = true

    connects_to database: { writing: :github, reading: :github }
  end
end
