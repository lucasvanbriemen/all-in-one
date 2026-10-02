module Weather
  # Turns a forecast into a clothing recommendation. Thresholds are on the
  # *felt* temperature for the rest of the day, so a windy 12° suggests a
  # jacket while a still 12° in the sun does not.
  module Outfit
    extend self

    SNOW_CODES = [71, 73, 75, 77, 85, 86].freeze
    STORM_CODES = [95, 96, 99].freeze

    def recommend(forecast)
      today = forecast[:today]
      current = forecast[:current]

      warmest = today[:feels_like_max].to_f
      coldest = today[:feels_like_min].to_f
      rain_chance = today[:rain_chance].to_i
      wind = current[:wind_speed].to_f
      uv = today[:uv_index].to_f
      codes = [current[:weather_code], today[:weather_code]].map(&:to_i)

      items = []
      notes = []

      # Top, picked on the warmest part of the day…
      top =
        if warmest >= 24 then "T-shirt"
        elsif warmest >= 18 then "Shirt"
        elsif warmest >= 12 then "Sweater"
        elsif warmest >= 5 then "Sweater and a jacket"
        else "Thick sweater and a winter coat"
        end
      items << top

      # …but a layer if it starts or ends cold.
      if warmest >= 18 && coldest < 13
        items << "Light jacket for the morning or evening"
      elsif warmest >= 12 && warmest < 18 && coldest < 8
        items << "Jacket"
      end

      # Bottoms.
      items << (warmest >= 22 ? "Shorts" : "Long trousers")

      # Rain, snow, storms.
      if codes.any? { |c| SNOW_CODES.include?(c) }
        items << "Waterproof shoes"
        notes << "Snow expected"
      elsif rain_chance >= 60 || today[:rain_total].to_f >= 2
        items << "Rain jacket"
        items << "Umbrella" if wind < 30
        notes << "#{rain_chance}% chance of rain"
      elsif rain_chance >= 35
        notes << "Possible showers (#{rain_chance}%), consider a hood"
      end

      notes << "Thunderstorms possible" if codes.any? { |c| STORM_CODES.include?(c) }

      # Wind.
      if wind >= 40
        notes << "Strong wind, dress warmer than the temperature suggests"
      elsif wind >= 25 && warmest < 20
        notes << "Windy, a windbreaker helps"
      end

      # Sun.
      if uv >= 6
        items << "Sunglasses"
        notes << "High UV, use sunscreen"
      elsif uv >= 3 && current[:is_day]
        items << "Sunglasses"
      end

      items << "Hat, scarf and gloves" if coldest <= 2

      {
        headline: headline(warmest, coldest, rain_chance),
        items: items.uniq,
        notes: notes
      }
    end

    private

    def headline(warmest, coldest, rain_chance)
      base =
        if warmest >= 26 then "Hot day"
        elsif warmest >= 20 then "Warm day"
        elsif warmest >= 14 then "Mild day"
        elsif warmest >= 8 then "Chilly day"
        else "Cold day"
        end

      base += " with a cold start" if warmest - coldest >= 8 && coldest < 12
      base += ", bring rain gear" if rain_chance >= 60
      base
    end
  end
end
