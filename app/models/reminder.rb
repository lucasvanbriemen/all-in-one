class Reminder < ApplicationRecord

  validates :title, presence: true

  BECOMES_IMPORTANT_AFTER = 7.days

  scope :uncompleted, -> { where(completed: false) }

  def remind_at
    super || created_at + BECOMES_IMPORTANT_AFTER
  end
end
