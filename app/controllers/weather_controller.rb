class WeatherController < ApplicationController
  CACHE_DURATION = 30.minutes

  def index
    @weather = Rails.cache.fetch("weather:today", expires_in: CACHE_DURATION) do
      Weather::Forecast.weather_for_today
    end

    render json: @weather
  end
end
