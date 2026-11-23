class SearchPicksController < ApplicationController
  # Called when a search result is opened; see SearchPick.
  def create
    result = params.require(:result).permit!.to_h
    SearchPick.create!(query: params[:query].to_s.strip, source: result.fetch("source"), result: result)
    head :created
  end
end
