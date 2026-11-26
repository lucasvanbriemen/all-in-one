class DeviceTokensController < ApplicationController
  def create
    device_token = DeviceToken.register(
      token: params.require(:token),
      platform: params.require(:platform),
      topic: params[:topic],
      environment: params[:environment]
    )
    render json: device_token, status: device_token.previously_new_record? ? :created : :ok
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # Heartbeat from the Mac app while the computer is in use.
  def active
    updated = DeviceToken.where(token: params[:id]).update_all(last_active_at: Time.current)
    head(updated.zero? ? :not_found : :no_content)
  end

  def destroy
    DeviceToken.where(token: params[:id]).destroy_all
    head :no_content
  end
end
