# Thin wrapper around Apnotic configured from the environment:
#
#   APNS_KEY_PATH  the .p8 auth key from developer.apple.com; relative paths
#                  resolve against Rails.root (default config/apns.p8)
#   APNS_KEY_ID    the key's 10-character ID
#   APNS_TEAM_ID   Apple developer team ID
#   APNS_ENV       "development" (Xcode/debug builds) or "production"
#                  (TestFlight, App Store, Developer ID). A token registered
#                  under one environment is rejected by the other.
#   APNS_TOPIC     bundle ID; defaults to the app's nl.ltvb.aio
#
# Token-based auth means one key serves both iOS and macOS, and both APNs
# environments.
module Push
  module Apns
    TOPIC = ENV.fetch("APNS_TOPIC", "nl.ltvb.aio")

    def self.key_path
      Rails.root.join(ENV.fetch("APNS_KEY_PATH", "config/apns.p8")).to_s
    end

    def self.production?
      ENV.fetch("APNS_ENV", "development") == "production"
    end

    def self.connection
      options = {
        auth_method: :token,
        cert_path: key_path,
        key_id: ENV.fetch("APNS_KEY_ID"),
        team_id: ENV.fetch("APNS_TEAM_ID")
      }
      production? ? Apnotic::Connection.new(options) : Apnotic::Connection.development(options)
    end

    # Builds an alert push for one device. APNs wants the same payload shape
    # on iOS and macOS.
    def self.notification_for(device_token, notification)
      Apnotic::Notification.new(device_token.token).tap do |n|
        n.topic = TOPIC
        n.push_type = "alert"
        n.priority = 10
        n.alert = { title: notification.title.to_s, body: notification.body.to_s }
        n.sound = "default"
        n.custom_payload = { notification_id: notification.id, source: notification.source }
      end
    end
  end
end
