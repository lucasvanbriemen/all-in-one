# Runs every morning; on Dec 1–24 it announces that day's advent door.
class AdventPushJob < ApplicationJob
  queue_as :default

  def perform(today = Date.current)
    return unless today.month == 12 && today.day <= Seasonal::Season::ADVENT_DAYS

    source = "home.advent.#{today.day}"
    # Sources repeat every year, so only one sent today counts as a duplicate.
    return if Notification.where(source: source, created_at: Time.current.all_day).exists?

    door = Seasonal::Advent.new(Seasonal::Season.new(today)).door(today.day)
    Notification.create!(title: "🎁 Door #{today.day} is open", body: door[:title], source: source)
  end
end
