class PushNotificationJob < ApplicationJob
  queue_as :default

  def perform(notification_id)
    notification = Notification.find(notification_id)
    connection = Push::Apns.connection

    DeviceToken.all.each do |device|
      connection.push(Push::Apns.notification_for(device, notification))
    end

    connection.close
  end
end
