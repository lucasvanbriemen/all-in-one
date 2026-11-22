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
end
