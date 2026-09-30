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

    render plain: "Bank connected. Syncing accounts in the background."
  end

  def show
    balance = Bank::Account.first.balance_amount
    monthly_average = Bank::Transaction.monthly_average
    # recurring = Bank::RecurringCosts.call
    salary = Bank::Transaction.expected_salary
    # fixed_costs = recurring.reject { |r| r[:stopped] }.sum { |r| r[:monthly_amount] }.round(2)
    #
    render plain: Bank::Account.first.next_payday
    return

    render json: {
      data: [
        {
          value: balance,
          label: "Balance",
          attentionLevel: "low"
        },
        {
          value: monthly_average[:income],
          label: "Average Income",
          attentionLevel: "low"
        },
        {
          value: monthly_average[:expense],
          label: "Average Expense",
          attentionLevel: monthly_average[:expense] > monthly_average[:income] ? "high" : "low"
        },
        {
          # value: fixed_costs,
          label: "Fixed Costs",
          attentionLevel: "low"
        },
        {
          value: salary&.dig(:amount),
          label: "Salary",
          attentionLevel: "low"
        }
      ],
      salary: salary,
      # recurring: recurring,
      transactions: Bank::Transaction.order(booking_date: :desc).limit(50)
    }
  end
end
