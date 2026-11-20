class Github::OrganizationsController < ApplicationController
  def index
    render json: Github::Organization.all
  end
end
