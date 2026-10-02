class AccountController < ApplicationController
  def show
    render json: {
      config: Config::CONFIG
      allowed_platforms: Config::ALLOWED_PLATFORMS
    }
  end
end
