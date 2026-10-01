module Banking
  # Predictable but irregular spend: merchants (or merchant groups such as fuel)
  # that show up in most months, regardless of how much or how often. These are
  # not caught by RecurringCosts, which requires stable amounts and intervals.
  class VariableCosts
    LOOKBACK_MONTHS = 6
    # Share of the months in the window a merchant must appear in (at least 2).
    MIN_ACTIVE_SHARE = 0.5

    def self.call(recurring: [])
      new(recurring: recurring).call
    end

    def initialize(recurring: [])
      @recurring_keys = recurring.map { |r| normalize(r[:counterparty]) }.to_set
    end

    def call
      transactions = Bank::Transaction.expense.excluding_savings
        .where(booking_date: lookback_start..)
        .order(:booking_date)

      @months_in_window = months_between(first_full_month(transactions), Date.current)
      return [] if @months_in_window < 2

      transactions.group_by { |t| key_for(t) }
        .reject { |key, _| key.blank? || @recurring_keys.include?(key) }
        .filter_map { |key, group| analyze(key, group) }
        .sort_by { |r| -r[:monthly_amount] }
    end

    private

    def lookback_start
      LOOKBACK_MONTHS.months.ago.beginning_of_month.to_date
    end

    # The oldest month in the window is only counted when it is covered from
    # the start, so a single late transaction does not add a whole month.
    def first_full_month(transactions)
      first = transactions.first&.booking_date
      return nil if first.nil?

      first == first.beginning_of_month ? first : first.next_month.beginning_of_month
    end

    # Calendar months with data, counting the current (partial) month as one.
    def months_between(from, to)
      return 0 if from.nil?

      (to.year * 12 + to.month) - (from.year * 12 + from.month) + 1
    end

    def min_active_months
      [ (@months_in_window * MIN_ACTIVE_SHARE).ceil, 2 ].max
    end

    def key_for(transaction)
      name = normalize(transaction.counterparty_name)
      group = MoneyConfig::MERCHANT_GROUPS.find { |_, keywords| keywords.any? { |k| name.include?(k) } }
      group ? group.first : name
    end

    def normalize(name)
      name.to_s.downcase.squish
    end

    def analyze(key, group)
      months = group.map { |t| t.booking_date.beginning_of_month }.uniq
      return nil if months.size < min_active_months

      total = group.sum { |t| t.amount.abs }
      {
        name: MoneyConfig::MERCHANT_GROUPS.key?(key) ? key : group.last.counterparty_name,
        grouped: MoneyConfig::MERCHANT_GROUPS.key?(key),
        monthly_amount: (total / @months_in_window).round(2),
        average_transaction: (total / group.size).round(2),
        occurrences: group.size,
        active_months: months.size,
        last_seen: group.last.booking_date
      }
    end
  end
end
