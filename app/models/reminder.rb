class Reminder < ApplicationRecord

  validates :title, presence: true

  DEFAULT_REMINDER_SPAN = 7.days

  scope :uncompleted, -> { where(completed: false) }

  def remind_at
    super || created_at + DEFAULT_REMINDER_SPAN
  end
end
