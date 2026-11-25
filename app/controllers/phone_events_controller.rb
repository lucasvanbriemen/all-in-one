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
