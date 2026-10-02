class CalendarEvent < ApplicationRecord
  validates :title, presence: true
  validates :starts_at, presence: true

  # Everything overlapping the window: an event that started before `from`
  # but runs into it still belongs on that day.
  scope :between, ->(from, to) {
    where("starts_at < ? AND COALESCE(ends_at, starts_at) >= ?", to, from)
  }

  scope :upcoming, ->(limit = 5) {
    where("COALESCE(ends_at, starts_at) >= ?", Time.current).order(:starts_at).limit(limit)
  }

  def google?
    source == "google"
  end

  def ends_at
    super || starts_at
  end
end
