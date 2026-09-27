module Banking
  class Sync
    # Days re-read before the newest stored booking date on every run.
    START_CHECKING_BACK = 3.days

    def initialize(connection)
      @connection = connection
    end

    def run
      return if @connection.expired?

      @connection.accounts.each { |account| sync_account(account) }
    end

    private

    def sync_account(account)
      account.update_balance!(Banking::Connection.balances(account.uid))

      Banking::Connection.transactions(account.uid, date_from: date_from(account)).each do |payload|
        Bank::Transaction.from_api!(account, payload)
      end
    end

    # How far back to check for transactions relative to the newest stored booking date.
    def date_from(account)
      newest = account.transactions.maximum(:booking_date)
      newest - START_CHECKING_BACK
    end
  end
end
