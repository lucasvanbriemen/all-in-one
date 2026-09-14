require "test_helper"

class DeviceTokenTest < ActiveSupport::TestCase
  test "register upserts on token" do
    first = DeviceToken.register(token: "abc", platform: "ios")
    second = DeviceToken.register(token: "abc", platform: "macos")

    assert_equal first.id, second.id
    assert_equal "macos", second.reload.platform
    assert_equal 1, DeviceToken.count
  end

  test "rejects unknown platforms" do
    assert_raises(ActiveRecord::RecordInvalid) { DeviceToken.register(token: "abc", platform: "android") }
  end
end
