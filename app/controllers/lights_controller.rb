class LightsController < ApplicationController
  def index
    all_lights = LightsConfig::LIGHTS_NAMES
    all_scenes = LightsConfig::SCENES
    render json: { lights: all_lights, scenes: all_scenes }
  end

  def update
    hex = params[:hex]
    brightness = params[:brightness] || 254
    Lights::Bridge.change(hex, brightness: brightness)
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
