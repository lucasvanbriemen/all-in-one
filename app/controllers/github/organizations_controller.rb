class Github::OrganizationsController < ApplicationController
  def index
    render json: Github::Organization.all.includes(:repositories).as_json(include: :repositories)
  end
end
