class AccountController < ApplicationController
  def show
    render json: {
      config: Config::GROUPS.map { |group| group.slice(:path, :name, :ios_icon) }
    }
  end
end
