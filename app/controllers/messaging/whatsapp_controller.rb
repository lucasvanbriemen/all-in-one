module Messaging
  # Account state and linking for the WhatsApp connector.
  class WhatsappController < ApplicationController
    def show
      account = Account.whatsapp
      live = begin
        Whatsapp::Client.state
      rescue Whatsapp::Client::Error => e
        { "status" => "unreachable", "lastError" => e.message }
      end

      render json: {
        provider: "whatsapp",
        status: live["status"],
        pairing_code: live["pairingCode"] || account.pairing_code,
        me: live["me"] || { id: account.external_id, name: account.name },
        last_error: live["lastError"] || account.last_error,
        connected_at: live["connectedAt"] || account.connected_at,
        conversations: account.conversations.count,
        contacts: account.contacts.count
      }
    end

    def pair
      render json: Whatsapp::Client.pair(phone: params[:phone])
    rescue Whatsapp::Client::Error => e
      render json: { error: e.message }, status: e.status || :bad_gateway
    end

    # Pulls the connector's cached chats, contacts and groups into the database.
    # Useful right after linking, before live events have filled things in.
    def sync
      events = Whatsapp::Events.new
      Whatsapp::Client.contacts.each { |c| events.handle("contact", c) }
      Whatsapp::Client.chats.each { |c| events.handle("chat", c) }
      Whatsapp::Client.groups.each { |g| events.handle("group", g) }
      show
    rescue Whatsapp::Client::Error => e
      render json: { error: e.message }, status: e.status || :bad_gateway
    end

    def logout
      Whatsapp::Client.logout
      Account.whatsapp.update!(status: "needs_relink", external_id: nil, name: nil)
      head :ok
    rescue Whatsapp::Client::Error => e
      render json: { error: e.message }, status: e.status || :bad_gateway
    end
  end
end
