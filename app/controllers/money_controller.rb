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
  end

  def callback
    if params[:state].blank? || params[:state] != session.delete(:banking_state)
      return render json: { error: "state mismatch" }, status: :unprocessable_entity
    end
    return render json: { error: params[:error_description] || params[:error] }, status: :unprocessable_entity if params[:code].blank?

    connection = Bank::Connection.from_session!(Banking::Connection.create_session(params[:code]))
    SyncBankConnectionJob.perform_later(connection.id)

    redirect_to money_path
  end
end
