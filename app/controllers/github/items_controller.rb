class Github::ItemsController < ApplicationController
  def index
    render json: Github::Item.all.limit(50)
  end
end
