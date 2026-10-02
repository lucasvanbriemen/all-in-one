class WeatherController < ApplicationController
  def index
    @weather = Weather::Forecast.weather_for_today

    render json: @weather
  end
end
