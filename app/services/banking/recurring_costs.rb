module Bank
  class RecurringCosts
    LOOKBACK_MONTHS = 6
    MIN_OCCURRENCES = 3
    AMOUNT_TOLERANCE = 0.03
    INTERVALS = {
      "monthly" => 26..35,
      "quarterly" => 85..97,
      "yearly" => 355..375
    }.freeze
    STOPPED_GRACE_DAYS = 14

    def self.call
      new.call
    end

    def call
      transactions = Bank::Transaction.expense.excluding_savings
        .where(booking_date: LOOKBACK_MONTHS.months.ago.to_date..)
        .order(:booking_date)

      transactions.group_by { |t| key_for(t) }
        .flat_map { |key, group| cluster_by_amount(group).map { |cluster| [ key, cluster, group.size > cluster.size ] } }
        .filter_map { |key, cluster, labelled| analyze(key, cluster, labelled) }
        .sort_by { |r| [ r[:stopped] ? 1 : 0, -r[:monthly_amount] ] }
    end

    private

    def key_for(transaction)
      transaction.counterparty_iban.presence || transaction.counterparty_name.to_s.downcase.squish
    end

    # One counterparty can carry several distinct recurring payments (e.g. a
    # hosting provider with two products). Split into clusters of similar amounts.
    def cluster_by_amount(group)
      group.sort_by { |t| t.amount.abs }.each_with_object([]) do |transaction, clusters|
        current = clusters.last
        if current && (transaction.amount.abs - current.last.amount.abs) <= current.last.amount.abs * AMOUNT_TOLERANCE
          current << transaction
        else
          clusters << [ transaction ]
        end
      end.map { |cluster| cluster.sort_by(&:booking_date) }
    end

    def analyze(key, group, labelled)
      return nil if key.blank? || group.size < MIN_OCCURRENCES

      dates = group.map(&:booking_date)
      gaps = dates.each_cons(2).map { |a, b| (b - a).to_i }
      interval = INTERVALS.find { |_, range| range.cover?(median(gaps)) }&.first
      return nil unless interval

      amounts = group.map { |t| t.amount.abs }
      typical = median(amounts)
      return nil if amounts.any? { |a| (a - typical).abs > typical * AMOUNT_TOLERANCE }

      next_expected = dates.last + median(gaps).round.days
      {
        counterparty: group.last.counterparty_name,
        label: labelled ? label_for(group.last) : nil,
        amount: group.last.amount.abs,
        interval: interval,
        monthly_amount: monthly_amount(typical, interval),
        occurrences: group.size,
        last_seen: dates.last,
        next_expected: next_expected,
        stopped: next_expected + STOPPED_GRACE_DAYS < Date.current
      }
    end

    def label_for(transaction)
      label = transaction.description.to_s[/Omschrijving: (.*?)(?: IBAN:|$)/m, 1]&.squish
      label unless label.nil? || label.match?(/\d{5,}/)
    end

    def monthly_amount(amount, interval)
      factor = { "monthly" => 1, "quarterly" => 1.0 / 3, "yearly" => 1.0 / 12 }.fetch(interval)
      (amount * factor).round(2)
    end

    def median(values)
      sorted = values.sort
      mid = sorted.size / 2
      sorted.size.odd? ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0
    end
  end
end
