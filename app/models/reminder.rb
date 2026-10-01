class Reminder < ApplicationRecord

  validates :title, presence: true

  DEFAULT_REMINDER_SPAN = 7.days

  scope :uncompleted, -> { where(completed: false) }

  # Mirrors #remind_at's fallback in SQL so reminders without an explicit
  # remind_at still show up once their default span has passed.
  scope :reminding, -> {
    uncompleted.where(
      "COALESCE(remind_at, DATE_ADD(created_at, INTERVAL ? SECOND)) <= ?",
      DEFAULT_REMINDER_SPAN.to_i, Time.current
    )
  }

  def remind_at
    super || created_at + DEFAULT_REMINDER_SPAN
  end
end
