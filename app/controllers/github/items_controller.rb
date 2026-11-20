class Github::ItemsController < ApplicationController
  def index
    render json: Github::Item.all
  end
end
