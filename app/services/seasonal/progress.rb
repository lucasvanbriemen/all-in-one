module Seasonal
  # Things that grow through December: the tree decorates itself as you get
  # things done, and the gift budget fills up.
  class Progress
    attr_reader :season

    def initialize(season)
      @season = season
    end

    # An ornament per reminder completed, a light per transaction categorised
    # this December (updated_at stands in for "categorised at"), and the star
    # once the inbox is at zero.
    def tree
      {
        ornaments: Reminder.where(completed: true, updated_at: season.this_december).count,
        lights: Bank::Transaction.where.not(category: nil).where(updated_at: season.this_december).count,
        star: !Notification.unread.where("source LIKE ?", "email.%").exists?
      }
    end

    def gifts
      transactions = Bank::Transaction.expense.where(category: "Gifts", booking_date: season.november..)
        .order(booking_date: :desc, id: :desc).pluck(:id, :counterparty_name, :amount, :booking_date)

      {
        budget: MoneyConfig::GIFT_BUDGET,
        spent: transactions.sum { |_, _, amount, _| amount }.abs.to_f.round(2),
        transactions: transactions.map do |id, name, amount, date|
          { id: id, counterparty_name: name, amount: amount.to_f, booking_date: date.iso8601 }
        end
      }
    end
  end
end
