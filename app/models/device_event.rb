# A state change reported by the lamp bridge. See Lights::EventsController.
class DeviceEvent < ApplicationRecord
  # MariaDB stores json as checked text, which Rails reads as a plain string without this.
  attribute :value, :json

  # The last known value of every attribute, per device, without asking the bridge:
  # { "1-1" => { "isTurnedOn" => true, "brightness" => 200, ... } }
  # Events arrive in batches in the order they happened, so the highest id is the newest.
  def self.latest_states
    latest_ids = group(:device_id, :attribute_name).maximum(:id).values

    where(id: latest_ids).each_with_object(Hash.new { |hash, key| hash[key] = {} }) do |event, states|
      states[event.device_id][event.attribute_name] = event.value
    end
  end
end
