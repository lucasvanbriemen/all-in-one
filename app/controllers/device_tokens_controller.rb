class DeviceTokensController < ApplicationController
  def create
    device_token = DeviceToken.register(token: params.require(:token), platform: params.require(:platform))
    render json: device_token, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def destroy
    DeviceToken.where(token: params[:id]).destroy_all
    head :no_content
  end
end
