module Lights
  # The lamp bridge (matter-connector on the Pi) posts batches of state changes here:
  # { events: [{ device_id, device_type, attribute, value, snapshot, at }] }
  class EventsController < ActionController::API
    before_action :verify_secret

    def create
      now = Time.current
      rows = params.require(:events).map do |event|
        {
          device_id: event[:device_id],
          device_type: event[:device_type],
          attribute_name: event[:attribute],
          value: event[:value],
          snapshot: event[:snapshot] == true,
          occurred_at: Time.zone.parse(event[:at].to_s) || now,
          created_at: now
        }
      end
      DeviceEvent.insert_all(rows) if rows.any?
      head :ok
    end

    private

    def verify_secret
      secret = ENV["LIGHTS_BRIDGE_SECRET"]
      return if secret.present? && ActiveSupport::SecurityUtils.secure_compare(request.headers["X-Bridge-Secret"].to_s, secret)

      head :unauthorized
    end
  end
end
