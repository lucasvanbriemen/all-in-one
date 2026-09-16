class MusicController < ApplicationController
  BASE_URL = "https://itunes.apple.com/search"
  TIMEOUT_SECONDS = 5

  def new
  end

  def index
    @songs = Music::Song.liked_songs

    render json: @songs
  end

  def search
    uri = URI(BASE_URL)
    uri.query = URI.encode_www_form(term: params[:term].to_s, entity: "song", country: "NL", limit: 30)

    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
      http.request(Net::HTTP::Get.new(uri))
    end
    return [] unless response.is_a?(Net::HTTPOK)

    raw_results = JSON.parse(response.body)["results"] || []

    results = raw_results.map do |raw_result|
      {
        title: raw_result["trackName"],
        artist: raw_result["artistName"],
        album: raw_result["collectionName"],
        image_url: raw_result["artworkUrl100"]
      }
    end

    render json: results
  end

  def show
    isrc = params[:isrc].to_s
    Music::SongDownloader.ensure_downloaded(isrc)
    send_audio_file(Music::SongDownloader.path(isrc))
  end

  private

  def send_audio_file(path)
    response.headers["Accept-Ranges"] = "bytes"
    ranges = Rack::Utils.get_byte_ranges(request.headers["Range"], path.size)
    if ranges&.one?
      range = ranges.first
      response.headers["Content-Range"] = "bytes #{range.begin}-#{range.end}/#{path.size}"
      send_data File.binread(path, range.size, range.begin), type: "audio/mpeg", disposition: "inline", status: :partial_content
    else
      send_file path, type: "audio/mpeg", disposition: "inline"
    end
  end
end
