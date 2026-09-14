module Push
  module Apns
    def self.key_path
      Rails.root.join("config/apns.p8").to_s
    end

    def self.connection
      options = {
        auth_method: :token,
        cert_path: key_path,
        key_id: ENV.fetch("APNS_KEY_ID"),
        team_id: ENV.fetch("APNS_TEAM_ID")
      }
      Apnotic::Connection.new(options)
    end

    def self.notification_for(device_token, notification)
      Apnotic::Notification.new(device_token.token).tap do |n|
        n.topic = "nl.ltvb.aio"
        n.push_type = "alert"
        n.priority = 10
        n.alert = { title: notification.title.to_s, body: notification.body.to_s }
        n.sound = "default"
        n.custom_payload = { notification_id: notification.id, source: notification.source }
      end
    end
  end
end
