require "test_helper"

class DeviceTokenTest < ActiveSupport::TestCase
  setup do
    DeviceToken.delete_all
    @mac = DeviceToken.create!(token: "mac", platform: "macos")
    @phone = DeviceToken.create!(token: "phone", platform: "ios")
  end

  test "pushes only to the Mac while it is in use" do
    @mac.update!(last_active_at: 30.seconds.ago)
    assert_equal [@mac], DeviceToken.recipients
  end

  test "pushes everywhere once the Mac has gone quiet" do
    @mac.update!(last_active_at: 5.minutes.ago)
    assert_equal [@mac, @phone].sort_by(&:id), DeviceToken.recipients.sort_by(&:id)
  end

  test "a phone heartbeat does not silence other devices" do
    @phone.update!(last_active_at: Time.current)
    assert_equal 2, DeviceToken.recipients.size
  end
end
