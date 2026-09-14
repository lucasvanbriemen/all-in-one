class PushNotificationJob < ApplicationJob
  queue_as :default

  def perform(notification_id)
    notification = Notification.find(notification_id)

    DeviceToken.all.group_by(&:environment).each do |environment, devices|
      connection = Push::Apns.connection(environment)
      devices.each do |device|
        connection.push(Push::Apns.notification_for(device, notification))
      end
      connection.close
    end
  end
end
