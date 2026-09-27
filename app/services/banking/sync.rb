module Banking
  # Pulls the latest balance and transactions for every account of a
  # connection into the database. Safe to run repeatedly: transactions are
  # matched on the bank's entry reference, and the window re-reads a few
  # days before the last known booking so late bookings are picked up.
  class Sync
    # Days re-read before the newest stored booking date on every run.
    OVERLAP = 3.days
    # How far back the first sync of an account goes. ING returns at most
    # 90 days of history on a fresh consent.
    HISTORY = 90.days

    def initialize(connection)
      @connection = connection
    end

    def run
      return if @connection.expired?

      @connection.accounts.each { |account| sync_account(account) }
      @connection.record_sync_success!
    rescue StandardError => e
      Rails.logger.warn("[banking] sync of #{@connection.aspsp_name} failed: #{e.message}")
      @connection.record_sync_failure!(e)
    end

    private

    def sync_account(account)
      account.update_balance!(Banking::Connection.balances(account.uid))

      Banking::Connection.transactions(account.uid, date_from: date_from(account)).each do |payload|
        Bank::Transaction.from_api!(account, payload)
      end
    end

    # Until a sync has completed once, always read the full history: a run
    # that failed halfway leaves the newest transactions stored and the
    # older ones missing, so the newest booking date alone would hide the gap.
    def date_from(account)
      newest = account.transactions.maximum(:booking_date)
      return HISTORY.ago.to_date if newest.nil? || @connection.last_synced_at.nil?

      newest - OVERLAP
    end
  end
end
