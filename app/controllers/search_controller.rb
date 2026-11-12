class SearchController < ApplicationController
  def index
    render json: {
      "test" => "1"
    }
  end
end
