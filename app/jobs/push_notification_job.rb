class PushNotificationJob < ApplicationJob
  queue_as :default

  def perform(notification_id)
    notification = Notification.find(notification_id)
    return if notification.silent

    connections = Hash.new { |hash, environment| hash[environment] = Push::Apns.connection(environment) }

    DeviceToken.recipients.each do |device|
      deliver(connections, device, notification)
    end
  ensure
    connections&.each_value(&:close)
  end

  private

  def deliver(connections, device, notification)
    response = connections[device.environment].push(Push::Apns.notification_for(device, notification))
    return unless response

    case [response.status, response.body.is_a?(Hash) ? response.body["reason"] : nil]
    in ["410", _] | ["400", "Unregistered"]
      device.destroy
    in ["400", "BadDeviceToken"]
      # The token came from the other APNs environment (a local Xcode build
      # reported as production, or the other way round). Retry there and,
      # when it works, remember it.
      retry_response = connections[device.other_environment].push(Push::Apns.notification_for(device, notification))
      device.update!(environment: device.other_environment) if retry_response&.ok?
    else
      nil
    end
  end
end
