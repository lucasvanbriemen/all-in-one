module Push
  module Apns
    def self.key_path
      Rails.root.join("config/apns.p8").to_s
    end

    # One connection per APNs environment: Apple runs separate hosts for
    # development (Xcode-signed builds) and production (release builds), and a
    # token only works on the host it was minted for.
    def self.connection(environment = "production")
      options = {
        auth_method: :token,
        cert_path: key_path,
        key_id: ENV.fetch("APNS_KEY_ID"),
        team_id: ENV.fetch("APNS_TEAM_ID")
      }
      environment == "development" ? Apnotic::Connection.development(options) : Apnotic::Connection.new(options)
    end

    def self.notification_for(device_token, notification)
      Apnotic::Notification.new(device_token.token).tap do |n|
        n.topic = device_token.topic.presence || DeviceToken::DEFAULT_TOPIC
        n.push_type = "alert"
        n.priority = 10
        n.alert = { title: notification.title.to_s, body: notification.body.to_s }
        n.sound = "default"
        n.custom_payload = { notification_id: notification.id, source: notification.source }
      end
    end
  end
end
