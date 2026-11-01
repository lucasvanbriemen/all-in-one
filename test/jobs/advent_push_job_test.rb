require "test_helper"

class AdventPushJobTest < ActiveJob::TestCase
  test "announces the day's door once" do
    assert_difference -> { Notification.count }, 1 do
      AdventPushJob.perform_now(Date.new(2026, 12, 5))
      AdventPushJob.perform_now(Date.new(2026, 12, 5))
    end

    notification = Notification.last
    assert_equal "🎁 Door 5 is open", notification.title
    assert_equal "home.advent.5", notification.source
    assert notification.body.present?
  end

  test "stays quiet outside advent" do
    assert_no_difference -> { Notification.count } do
      AdventPushJob.perform_now(Date.new(2026, 11, 30))
      AdventPushJob.perform_now(Date.new(2026, 12, 25))
    end
  end
end
