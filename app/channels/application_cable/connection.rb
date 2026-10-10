module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_account

    # Only the token query param is accepted, never the cookie: request forgery
    # protection is off (the native app sends no Origin), so cookie auth would let
    # any site open a socket as the user.
    def connect
      token = request.params[:token]
      self.current_account = (Authentication.fetch_account(token) if token.present?) || reject_unauthorized_connection
    end
  end
end
