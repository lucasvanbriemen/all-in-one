class AddLastActiveAtToDeviceTokens < ActiveRecord::Migration[8.0]
  # Set by the Mac app's heartbeat while someone is using the computer, so
  # pushes go to the Mac instead of the phone. See DeviceToken.recipients.
  def change
    add_column :device_tokens, :last_active_at, :datetime
  end
end
