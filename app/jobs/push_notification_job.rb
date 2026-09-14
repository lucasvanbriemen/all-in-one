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

  # APNs reasons that mean the token will never work again.
  DEAD_TOKEN_REASONS = %w[BadDeviceToken Unregistered DeviceTokenNotForTopic].freeze

  retry_on SocketError, Errno::ECONNRESET, Errno::ECONNREFUSED, wait: :polynomially_longer, attempts: 5

  def perform(notification_id)
    unless Push::Apns.configured?
      Rails.logger.info("[APNS] not configured, skipping notification=#{notification_id}")
      return
    end

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
    response = connection.push(Push::Apns.notification_for(device, notification))

    if response.nil?
      Rails.logger.warn("[APNS] timeout for device=#{device.id} notification=#{notification.id}")
    elsif response.ok?
      Rails.logger.info("[APNS] delivered notification=#{notification.id} to device=#{device.id} (#{device.platform})")
    elsif DEAD_TOKEN_REASONS.include?(response.body["reason"]) || response.status == "410"
      Rails.logger.info("[APNS] removing dead token device=#{device.id}: #{response.body['reason']}")
      device.destroy
    else
      Rails.logger.warn("[APNS] failed device=#{device.id} notification=#{notification.id}: #{response.status} #{response.body}")
    end
  end
end
