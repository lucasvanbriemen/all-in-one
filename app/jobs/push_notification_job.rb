# Delivers one Notification row to every registered device over APNs.
#
# Failures are per device: a token APNs no longer recognises is deleted so we
# stop paying for it, a transient error leaves the token alone and is
# logged. The job itself only retries on connection-level problems, since
# re-sending after a partial success would duplicate banners on the devices
# that already got theirs.
class PushNotificationJob < ApplicationJob
  queue_as :default

  discard_on ActiveRecord::RecordNotFound

  retry_on SocketError, Errno::ECONNRESET, Errno::ECONNREFUSED, wait: :polynomially_longer, attempts: 5

  def perform(notification_id)
    notification = Notification.find(notification_id)
    tokens = DeviceToken.all.to_a
    return if tokens.empty?

    connection = Push::Apns.connection
    begin
      tokens.each { |device| deliver(connection, device, notification) }
    ensure
      connection.close
    end
  end

  private

  def deliver(connection, device, notification)
    connection.push(Push::Apns.notification_for(device, notification))
  end
end
