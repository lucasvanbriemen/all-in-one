class AddTopicAndEnvironmentToDeviceTokens < ActiveRecord::Migration[8.0]
  def change
    # APNs topic is the app's bundle id; the iOS and macOS builds have different ones.
    add_column :device_tokens, :topic, :string
    # "development" for Xcode-signed builds, "production" for TestFlight / App Store /
    # Developer ID. Apple rejects a token sent to the wrong host.
    add_column :device_tokens, :environment, :string, null: false, default: "production"
  end
end
