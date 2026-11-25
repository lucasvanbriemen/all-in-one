# iOS Shortcuts automations on the phone post here when something happens
# (joined/left home Wi-Fi, charger connected, ...). Stored next to the lamp events
# in device_events, so presence and light usage share one timeline.
#
# POST /phone/events
#   Header Authorization: Bearer <API_KEY>   (same key as the React Native app)
#   Body   { "event": "home_wifi", "value": true, "device": "iphone" }   (device is optional)
class PhoneEventsController < ApplicationController
  def create
    event = params.require(:event).to_s
    now = Time.current

    DeviceEvent.create!(
      device_id: params[:device].presence || "iphone",
      device_type: "phone",
      attribute_name: event,
      value: params[:value],
      occurred_at: now,
      created_at: now
    )
    head :ok
  end
end
