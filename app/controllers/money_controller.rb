class MoneyController < ApplicationController
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
  rescue StandardError => e
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
  rescue StandardError => e
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
end
