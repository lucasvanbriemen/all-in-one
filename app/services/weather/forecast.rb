require "net/http"

module Weather
  class Forecast
    LOCATION = "Rotterdam"
    API_KEY = ENV["WEATHER_API_KEY"]
    BASE_URL = "https://api.openweathermap.org/data/2.5"

    def self.weather_for_today
      current = fetch("weather")
      forecast = fetch("forecast")

      today = Time.zone.today
      todays_temps = forecast["list"]
        .select { |entry| Time.zone.at(entry["dt"]).to_date == today }
        .flat_map { |entry| [entry["main"]["temp_min"], entry["main"]["temp_max"]] }
      todays_temps << current["main"]["temp"]

      {
        temperature: format_temp(current["main"]["temp"]),
        feels_like: format_temp(current["main"]["feels_like"]),
        humidity: "#{current['main']['humidity']}%",
        min: format_temp(todays_temps.min),
        max: format_temp(todays_temps.max),
        condition: current["weather"][0]["main"]
      }
    end

    def self.fetch(path)
      uri = URI("#{BASE_URL}/#{path}?q=#{LOCATION}&units=metric&appid=#{API_KEY}")
      JSON.parse(Net::HTTP.get(uri))
    end

    def self.format_temp(value)
      "#{value.round}°C"
    end
  end
end
