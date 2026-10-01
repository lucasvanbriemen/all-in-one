class Reminder < ApplicationRecord
  scope :uncompleted, -> { where(completed: false) }
end
