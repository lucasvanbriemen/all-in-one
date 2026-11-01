# Christmas season extras. Every action takes an optional `date` param
# (YYYY-MM-DD) that stands in for today, to try out the season any time of year.
class SeasonalController < ApplicationController
  before_action :set_season, except: [ :state, :update_state ]

  rescue_from Seasonal::State::Invalid do |error|
    render json: { error: error.message }, status: :unprocessable_entity
  end

  def advent
    render json: { year: @season.year, unlocked: @season.unlocked_doors, doors: Seasonal::Advent.new(@season).doors }
  end

  def tree
    render json: Seasonal::Progress.new(@season).tree
  end

  def naughty_nice
    people = Seasonal::People.new(@season)
    render json: { naughty: people.naughty, nice: people.nice }
  end

  def greetings
    render json: { contacts: Seasonal::People.new(@season).greetings }
  end

  def christmas_songs
    render json: Seasonal::ChristmasSongs.call
  end

  def gifts
    render json: Seasonal::Progress.new(@season).gifts
  end

  def state
    render json: Seasonal::State.new.read
  end

  # Body: { "key": "advent.opened", "value": <any json> }
  def update_state
    body = request.request_parameters
    return render json: { error: "value is required" }, status: :unprocessable_entity unless body.key?("value")

    render json: Seasonal::State.new.write(body["key"], body["value"])
  end

  private

  def set_season
    @season = Seasonal::Season.from_param(params[:date])
  rescue Date::Error
    render json: { error: "date must be YYYY-MM-DD" }, status: :bad_request
  end
end
