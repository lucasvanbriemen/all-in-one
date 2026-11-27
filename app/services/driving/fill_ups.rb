module Driving
  # Fuel transactions from the bank, with litres per fill-up.
  #
  # Exact when the "fuel" Shortcut asked for the litres at the pump: an Apple
  # Pay Transaction automation posts event=fuel value={litres, amount} to
  # /phone/events, and it's matched to the bank transaction with that amount.
  #
  # Otherwise estimated from CBS's national average price for the day, scaled by
  # your own discount (the median of paid ÷ average over the exact fill-ups).
  class FillUps
    # The bank books a card payment a day or two after the pump.
    MATCH_WINDOW = 3.days

    def self.call(since:)
      new(since).call
    end

    def initialize(since)
      @since = since
    end

    def call
      return [] if transactions.empty?

      entered = match_entered_litres
      prices = FuelPrices.since(transactions.first.booking_date - 7.days)

      rows = transactions.map do |transaction|
        euros = -transaction.amount.to_f
        { transaction: transaction, euros: euros, average: FuelPrices.on(transaction.booking_date, prices), litres: entered[transaction.id] }
      end

      factor = discount_factor(rows)

      rows.map do |row|
        litres = row[:litres]
        estimated_price = row[:average] && row[:average] * factor
        litres ||= (row[:euros] / estimated_price) if estimated_price

        {
          date: row[:transaction].booking_date,
          station: row[:transaction].counterparty_name,
          euros: row[:euros].round(2),
          litres: litres&.round(1),
          litres_source: row[:litres] ? "entered" : ("estimated" if litres),
          price_per_litre: litres ? (row[:euros] / litres).round(3) : nil,
          average_price_per_litre: row[:average]
        }
      end
    end

    # Paid ÷ average price; below 1 means you got a discount. 1 until there's data.
    def discount_factor(rows)
      ratios = rows.filter_map { |r| (r[:euros] / r[:litres]) / r[:average] if r[:litres] && r[:average] }
      return 1.0 if ratios.empty?

      sorted = ratios.sort
      (sorted[(sorted.size - 1) / 2] + sorted[sorted.size / 2]) / 2
    end

    private

    def transactions
      @transactions ||= Bank::Transaction.where(category: "Fuel", booking_date: @since..).where("amount < 0").order(:booking_date).to_a
    end

    # { transaction_id => litres }. Each Shortcut entry fills at most one transaction.
    def match_entered_litres
      unmatched = transactions.dup

      fuel_events.each_with_object({}) do |event, matched|
        litres = parse_number(event.value["litres"])
        amount = parse_number(event.value["amount"])
        next unless litres&.positive?

        day = event.occurred_at.to_date
        candidates = unmatched.select { |t| (t.booking_date - day).abs <= MATCH_WINDOW.in_days }
        candidates = candidates.select { |t| (-t.amount.to_f - amount).abs < 0.01 } if amount
        transaction = candidates.min_by { |t| (t.booking_date - day).abs }
        next unless transaction

        matched[transaction.id] = litres
        unmatched.delete(transaction)
      end
    end

    def fuel_events
      DeviceEvent.where(device_type: "phone", attribute_name: "fuel", occurred_at: (@since.to_time - MATCH_WINDOW)..)
        .order(:occurred_at).select { |event| event.value.is_a?(Hash) }
    end

    # Shortcuts hands over "€ 55,41", "55.41" or "26,4"; Dutch decimal commas included.
    def parse_number(value)
      return value.to_f if value.is_a?(Numeric)

      text = value.to_s.gsub(/[^\d,.]/, "")
      return nil if text.empty?

      text = text.delete(".").tr(",", ".") if text.include?(",")
      text.to_f
    end
  end
end
