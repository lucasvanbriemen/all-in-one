class LightsController < ApplicationController
  def index
    statuses = DeviceEvent
      .where(device_id: LightsConfig::LIGHTS_NAMES.keys)
      .select("device_id, attribute_name, value")
      .where("id IN (SELECT MAX(id) FROM device_events GROUP BY device_id, attribute_name)")
      .group_by(&:device_id)


    lights = LightsConfig::LIGHTS_NAMES.map do |id, light|
      status = statuses[id]
      {
        id: id,
        name: light[:name],
        slug: light[:slug],
        status: {
          on: status&.find { |e| e.attribute_name == "isTurnedOn" }&.value,
          brightness: status&.find { |e| e.attribute_name == "brightness" }&.value,
          hex: status&.find { |e| e.attribute_name == "currentHex" }&.value
        }
      }
    end

    render json: { lights: lights, scenes: LightsConfig::SCENES }
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
    return render json: { error: "Unknown scene #{scene_name}" }, status: :not_found unless scene

    responses = Lights::Bridge.apply_scene(scene)
    success = responses.all? { |response| response.is_a?(Net::HTTPSuccess) }
    render json: { success: success }, status: success ? :ok : :bad_gateway
  end
end
