module Banking
  # Progress of each MoneyConfig::BUDGETS entry in the current pay period
  # (last payday up to the next one), based on hand-assigned categories.
  # Money coming back in the same category, such as a friend paying their
  # share of a dinner, is subtracted from what was spent.
  class Budgets
    def self.call(account: Bank::Account.first, today: Date.current)
      new(account: account, today: today).call
    end

    def initialize(account:, today:)
      @account = account
      @today = today
      @period_start = account.last_payday(today)
      @period_end = account.next_payday(today + 1)
    end

    def call
      totals = @account.transactions.where(booking_date: @period_start..@today).group(:category).sum(:amount)

      budgets = MoneyConfig::BUDGETS.map do |name, budget|
        spent = -MoneyConfig::BUDGET_CATEGORIES.fetch(name, [ name ]).sum { |category| totals.fetch(category, 0) }
        { name: name, budget: budget, spent: spent.round(2), remaining: (budget - spent).round(2), percentage_used: percentage(spent, budget) }
      end

      {
        period_start: @period_start,
        period_end: @period_end,
        percentage_time_passed: percentage((@today - @period_start).to_i, (@period_end - @period_start).to_i),
        budgets: budgets
      }
    end

    private

    def percentage(part, whole)
      whole.zero? ? 0 : (part.to_f / whole * 100).round
    end
  end
end
