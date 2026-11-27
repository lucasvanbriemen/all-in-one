require "net/http"

module Driving
  # Daily average Dutch pump prices from CBS open data (table 80416ned).
  # The full history is public, so nothing needs to be collected ahead of time.
  # CBS publishes with a few days' delay; a date without a price uses the last known one.
  class FuelPrices
    URL = "https://opendata.cbs.nl/ODataApi/odata/80416ned/TypedDataSet".freeze

    # { Date => euro per litre } for the configured fuel type.
    def self.since(date)
      Rails.cache.fetch("driving/fuel_prices/#{date}", expires_in: 12.hours) do
        filter = "Perioden ge '#{date.strftime('%Y%m%d')}'"
        uri = URI(URL)
        uri.query = URI.encode_www_form("$filter" => filter, "$select" => "Perioden,#{DrivingConfig::FUEL_TYPE}")

        JSON.parse(Net::HTTP.get(uri)).fetch("value").each_with_object({}) do |row, prices|
          price = row[DrivingConfig::FUEL_TYPE]
          prices[Date.strptime(row["Perioden"], "%Y%m%d")] = price.to_f if price
        end
      end
    end

    def self.on(date, prices)
      prices.select { |day, _| day <= date }.max_by(&:first)&.last
    end
  end
end
