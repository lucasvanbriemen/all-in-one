module Bank
  # One authorised Enable Banking session. Consent is time-boxed by the bank,
  # so once valid_until passes the user has to go through the bank login
  # again (BankingController#connect), which replaces the session id here.
  class Connection < ApplicationRecord
    has_many :accounts, foreign_key: :bank_connection_id, inverse_of: :connection, dependent: :destroy

    validates :session_id, :aspsp_name, :aspsp_country, :valid_until, presence: true

    # Consents that are about to expire get a reconnect prompt in the app.
    EXPIRY_WARNING = 7.days

    scope :active, -> { where("valid_until > ?", Time.current) }

    def expired?
      valid_until <= Time.current
    end

    def expiring_soon?
      valid_until <= EXPIRY_WARNING.from_now
    end

    # Creates or refreshes a connection from an Enable Banking session
    # payload. POST /sessions includes the session id; GET /sessions/:id does
    # not, so it can be passed explicitly. A re-authorisation of the same
    # bank replaces the previous session so accounts keep their ids and
    # history.
    def self.from_session!(session, session_id: session["session_id"])
      aspsp = session.fetch("aspsp")
      connection = find_or_initialize_by(aspsp_name: aspsp.fetch("name"), aspsp_country: aspsp.fetch("country"))
      connection.update!(
        session_id: session_id,
        valid_until: Time.zone.parse(session.dig("access", "valid_until")),
        last_sync_error: nil
      )
      session.fetch("accounts").each do |account|
        account = Banking::Connection.account_details(account) if account.is_a?(String)
        connection.accounts.from_api!(account)
      end
      connection
    end

    def record_sync_success!
      update!(last_synced_at: Time.current, last_sync_error: nil)
    end

    def record_sync_failure!(error)
      update!(last_sync_error: "#{error.class}: #{error.message}".truncate(60_000))
    end
  end
end
