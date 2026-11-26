class LightsController < ApplicationController
  def index
    statuses = DeviceEvent.latest_states
    ids_by_slug = LightsConfig::LIGHTS_NAMES.to_h { |id, light| [ light[:slug], id ] }

    rooms = LightsConfig::ROOMS.map do |slug, room|
      room.merge(
        scenes: LightsConfig::SCENES.select { |scene| scene[:room] == slug },
        lights: room[:lights].map { |light_slug| light_json(ids_by_slug[light_slug], statuses) }
      )
    end

    render json: rooms
  end

  def update
    hex = params[:hex]
    brightness = (params[:on] == false) ? 0 : (params[:brightness] || 254)
    Lights::Bridge.change(hex, brightness: brightness, id: params[:id].presence)
    render json: { success: true }
  end

  def apply_scene
    scene_name = params[:scene]
    scene = LightsConfig::SCENES.find { |s| s[:name] == scene_name }

    Lights::Bridge.apply_scene(scene)
    render :ok
  end

  def light_json(id, statuses)
    light = LightsConfig::LIGHTS_NAMES.fetch(id)
    status = statuses[id].presence

    {
      id: id,
      name: light[:name],
      slug: light[:slug],
      status: status && {
        on: status["isTurnedOn"],
        brightness: status["brightness"],
        hex: status["currentHex"]
      }
    }
  end
end
