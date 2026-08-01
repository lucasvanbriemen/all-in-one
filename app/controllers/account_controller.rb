class AccountController < ApplicationController
  def show
    render json: {
      config: Config::CONFIG
    }
  end
end
