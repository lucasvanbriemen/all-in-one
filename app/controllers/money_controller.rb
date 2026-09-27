class MoneyController < ApplicationController
  # Accounts with their latest balance, plus the state of the consent so the
  # app can show a reconnect prompt before it lapses.
  def index
    connections = Bank::Connection.includes(:accounts).order(:aspsp_name)

    render json: {
      connections: connections.map { |connection| connection_json(connection) },
      month: month_summary(Date.current)
    }
  end

  def transactions
    month = params[:month].present? ? Date.parse("#{params[:month]}-01") : Date.current
    scope = Bank::Transaction.in_month(month).recent
    scope = scope.where(category: params[:category]) if params[:category].present?
    scope = scope.where(bank_account_id: params[:account_id]) if params[:account_id].present?

    render json: {
      month: month.strftime("%Y-%m"),
      transactions: scope.limit(Bank::Transaction::ITEMS_PER_PAGE * 4)
    }
  end

  # Starts the bank consent flow: redirects the browser to the bank.
  def connect
    state = SecureRandom.hex(16)
    session[:banking_state] = state

    auth = Banking::Connection.authorize(
      aspsp_name: MoneyConfig::ASPSP[:name],
      country: MoneyConfig::ASPSP[:country],
      redirect_url: money_callback_url,
      state: state
    )
    redirect_to auth.fetch("url"), allow_other_host: true
  rescue Banking::Connection::Error => e
    render json: { error: e.message }, status: :bad_gateway
  end

  # Where the bank sends the user back. Exchanges the code for a session,
  # stores it, and kicks off the first sync.
  def callback
    if params[:state].blank? || params[:state] != session.delete(:banking_state)
      return render json: { error: "state mismatch" }, status: :unprocessable_entity
    end
    return render json: { error: params[:error_description] || params[:error] }, status: :unprocessable_entity if params[:code].blank?

    connection = Bank::Connection.from_session!(Banking::Connection.create_session(params[:code]))
    SyncBankConnectionJob.perform_later(connection.id)

    redirect_to money_path
  rescue Banking::Connection::Error => e
    render json: { error: e.message }, status: :bad_gateway
  end

  # Manual refresh from the app.
  def sync
    Bank::Connection.active.pluck(:id).each { |id| SyncBankConnectionJob.perform_later(id) }
    head :accepted
  end

  private

  def connection_json(connection)
    {
      id: connection.id,
      bank: connection.aspsp_name,
      valid_until: connection.valid_until,
      expired: connection.expired?,
      expiring_soon: connection.expiring_soon?,
      last_synced_at: connection.last_synced_at,
      last_sync_error: connection.last_sync_error,
      accounts: connection.accounts
    }
  end

  def month_summary(month)
    scope = Bank::Transaction.in_month(month).where.not(category: "savings")
    {
      month: month.strftime("%Y-%m"),
      income: scope.credits.sum(:amount),
      spending: scope.debits.sum(:amount).abs,
      to_savings: Bank::Transaction.in_month(month).where(category: "savings").sum(:amount).abs,
      by_category: scope.debits.group(:category).sum(:amount).transform_values(&:abs)
    }
  end
end
