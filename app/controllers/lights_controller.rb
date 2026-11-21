class LightsController < ApplicationController
  def update
    hex = params[:hex]
    brightness = params[:brightness] || 254
    Lights::Bridge.change(hex, brightness: brightness)
    render json: { success: true }
  end
end
