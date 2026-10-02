require "net/http"

module Weather
  # Open-Meteo needs no API key. Location comes from WEATHER_LATITUDE /
  # WEATHER_LONGITUDE; the default is Amsterdam.
  module Forecast
    extend self

    ENDPOINT = "https://api.open-meteo.com/v1/forecast".freeze
    CACHE_TTL = 15.minutes

    # WMO weather interpretation codes, grouped into what matters for dressing.
    CONDITIONS = {
      0 => "Clear", 1 => "Mostly clear", 2 => "Partly cloudy", 3 => "Overcast",
      45 => "Fog", 48 => "Freezing fog",
      51 => "Light drizzle", 53 => "Drizzle", 55 => "Heavy drizzle",
      56 => "Freezing drizzle", 57 => "Freezing drizzle",
      61 => "Light rain", 63 => "Rain", 65 => "Heavy rain",
      66 => "Freezing rain", 67 => "Freezing rain",
      71 => "Light snow", 73 => "Snow", 75 => "Heavy snow", 77 => "Snow grains",
      80 => "Rain showers", 81 => "Rain showers", 82 => "Violent showers",
      85 => "Snow showers", 86 => "Snow showers",
      95 => "Thunderstorm", 96 => "Thunderstorm with hail", 99 => "Thunderstorm with hail"
    }.freeze

    def current
      Rails.cache.fetch("weather/#{latitude}/#{longitude}", expires_in: CACHE_TTL) { fetch }
    rescue StandardError => e
      Rails.logger.warn("[Weather] #{e.class}: #{e.message}")
      nil
    end

    def latitude = ENV.fetch("WEATHER_LATITUDE", "52.37").to_f
    def longitude = ENV.fetch("WEATHER_LONGITUDE", "4.90").to_f

    private

    def fetch
      uri = URI(ENDPOINT)
      uri.query = URI.encode_www_form(
        latitude: latitude,
        longitude: longitude,
        timezone: "auto",
        forecast_days: 1,
        current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
        hourly: "apparent_temperature,precipitation_probability,precipitation",
        daily: "temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,weather_code,sunrise,sunset,uv_index_max"
      )

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 5) do |http|
        http.get(uri.request_uri)
      end
      raise "Open-Meteo responded with #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      shape(JSON.parse(response.body))
    end

    def shape(data)
      current = data["current"]
      daily = data["daily"]
      hourly = data["hourly"]
      code = current["weather_code"].to_i

      # The rest of the day: the hours still ahead decide what to wear, not
      # the ones already past.
      now_index = hourly["time"].index { |t| Time.zone.parse(t) >= Time.current.beginning_of_hour } || 0
      remaining = (now_index...hourly["time"].size)
      day_hours = remaining.select { |i| (7..22).cover?(Time.zone.parse(hourly["time"][i]).hour) }
      day_hours = remaining.to_a if day_hours.empty?

      {
        location: { latitude: latitude, longitude: longitude, timezone: data["timezone"] },
        fetched_at: Time.current,
        current: {
          temperature: current["temperature_2m"],
          feels_like: current["apparent_temperature"],
          humidity: current["relative_humidity_2m"],
          wind_speed: current["wind_speed_10m"],
          precipitation: current["precipitation"],
          weather_code: code,
          condition: CONDITIONS.fetch(code, "Unknown"),
          is_day: current["is_day"] == 1
        },
        today: {
          temperature_max: daily["temperature_2m_max"][0],
          temperature_min: daily["temperature_2m_min"][0],
          feels_like_max: day_hours.map { |i| hourly["apparent_temperature"][i] }.compact.max || daily["apparent_temperature_max"][0],
          feels_like_min: day_hours.map { |i| hourly["apparent_temperature"][i] }.compact.min || daily["apparent_temperature_min"][0],
          rain_chance: day_hours.map { |i| hourly["precipitation_probability"][i] }.compact.max || daily["precipitation_probability_max"][0],
          rain_total: day_hours.sum { |i| hourly["precipitation"][i].to_f }.round(1),
          uv_index: daily["uv_index_max"][0],
          weather_code: daily["weather_code"][0],
          condition: CONDITIONS.fetch(daily["weather_code"][0].to_i, "Unknown"),
          sunrise: daily["sunrise"][0],
          sunset: daily["sunset"][0]
        }
      }
    end
  end
end
