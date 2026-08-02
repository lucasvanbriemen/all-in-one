class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  ITEMS_PER_PAGE = 50
end
