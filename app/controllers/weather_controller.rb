class WeatherController < ApplicationController
  def show
    forecast = Weather::Forecast.current

    if forecast.nil?
      render json: { error: "Weather unavailable" }, status: :service_unavailable
    else
      render json: forecast.merge(outfit: Weather::Outfit.recommend(forecast))
    end
  end
end
