class PhoneEventsController < ApplicationController
  # Sent by iOS Shortcuts automations, e.g. event=home_wifi value=true, or
  # event=carplay value={"connected": true, "lat": 51.99, "lng": 5.86}.
  def create
    event = params.require(:event).to_s
    now = Time.current

    DeviceEvent.create!(
      device_id: params[:device].presence || "iphone",
      device_type: "phone",
      attribute_name: event,
      value: event_value,
      occurred_at: now,
      created_at: now
    )
    head :ok
  end

  private

  # A Shortcuts "Dictionary" arrives as nested params; plain values stay as-is.
  def event_value
    value = params[:value]
    value.respond_to?(:permit!) ? value.permit!.to_h : value
  end
end
