module Music
  # We have to use a seperate database, to not break the IOS app
  class ApplicationRecord < ActiveRecord::Base
    self.abstract_class = true

    connects_to database: { writing: :music, reading: :music }
  end
end
