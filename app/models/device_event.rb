# A state change reported by the lamp bridge. See Lights::EventsController.
class DeviceEvent < ApplicationRecord
  # MariaDB stores json as checked text, which Rails reads as a plain string without this.
  attribute :value, :json
end
