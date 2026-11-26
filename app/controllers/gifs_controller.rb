require "net/http"

# GIF search for the composer (GIPHY), and sending a picked GIF into a chat.
class GifsController < ApplicationController
  SEARCH_URL = "https://api.giphy.com/v1/gifs/"
  # Picked GIFs are downloaded server-side, so only fetch from GIPHY's own media hosts.
  MEDIA_HOST = /\Amedia\d*\.giphy\.com\z/

  UploadedGif = Struct.new(:data, :content_type, :original_filename) do
    def read = data
  end

  # Trending when there's no query.
  def index
    return render(json: { error: "GIPHY_API_KEY is not set" }, status: :service_unavailable) if ENV["GIPHY_API_KEY"].blank?

    query = params[:q].to_s.strip
    uri = URI("#{SEARCH_URL}#{query.empty? ? "trending" : "search"}")
    uri.query = { api_key: ENV["GIPHY_API_KEY"], q: query.presence, limit: 30, rating: "pg-13" }.compact.to_query
    response = JSON.parse(Net::HTTP.get(uri))

    render json: Array(response["data"]).filter_map { |gif| gif_json(gif) }
  end

  # Slack shows a GIF upload animated; WhatsApp only animates MP4s sent as GIFs.
  def create
    channel = Channel.find(params[:id])
    whatsapp = channel.is_a?(Whatsapp::Channel)
    url = whatsapp ? params.require(:mp4) : params.require(:url)
    uri = URI(url)
    return head :unprocessable_entity unless uri.is_a?(URI::HTTPS) && uri.host.match?(MEDIA_HOST)

    data = Net::HTTP.get(uri)
    file = whatsapp ? UploadedGif.new(data, "video/mp4", "gif.mp4") : UploadedGif.new(data, "image/gif", "#{params[:title].presence || "gif"}.gif")
    channel.upload(file, thread_id: params[:thread_id], quote_id: params[:quote_id], gif: true)
    render json: { success: true }
  end

  private

  def gif_json(gif)
    images = gif["images"] || {}
    preview = images["fixed_width_small"] || images["fixed_width"]
    original = images["downsized"] || images["original"]
    return unless preview && original

    {
      id: gif["id"],
      title: gif["title"],
      preview: preview["url"],
      width: preview["width"].to_i,
      height: preview["height"].to_i,
      url: original["url"],
      mp4: images.dig("original", "mp4") || images.dig("fixed_width", "mp4")
    }
  end
end
