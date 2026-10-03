Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.

  get "/email/:path", to: "emails#index", as: :mailbox
  get "/emails/:id", to: "emails#show", as: :email
  post "/emails/:id/mark_as_read", to: "emails#mark_as_read", as: :mark_email_as_read

  get "/weather", to: "weather#index", as: :weather

  get "/reminders", to: "reminders#index", as: :reminders
  post "/reminders", to: "reminders#create", as: :create_reminder
  post "/reminders/:id", to: "reminders#update", as: :update_reminder

  get "/server_data", to: "server#index", as: :server_data
  get "/notifications", to: "notification#index", as: :notifications

  get "/money/connect", to: "money#connect", as: :money_connect
  get "/money/callback", to: "money#callback", as: :money_callback
  get "/money", to: "money#show", as: :money
  get "/money/overview", to: "money#list_overview", as: :money_overview

  get "/music", to: "music#index", as: :music
  get "/music/stats", to: "plays#show", as: :plays_stats
  post "/music/stats/create", to: "plays#create", as: :plays_stats_create
  get "/music/search", to: "music#search", as: :search
  get "/get-mp3/:id", to: "music#show", as: :get_mp3
  get "/get-mp3/:id/prepare", to: "music#prepare_song", as: :prepare_music
  post "/music/:id/toggle-liked", to: "music#toggle_favorite", as: :toggle_music_favorite
  post "/notifications/:id/mark_as_read", to: "notification#update", as: :mark_notification_as_read
  post "/device_tokens", to: "device_tokens#create", as: :device_tokens
  delete "/device_tokens/:id", to: "device_tokens#destroy", as: :device_token, constraints: { id: /[^\/]+/ }

  get "/messages", to: "messages#index", as: :messages
  get "/messages/whatsapp", to: "messaging/whatsapp#show", as: :whatsapp_account
  post "/messages/whatsapp/pair", to: "messaging/whatsapp#pair", as: :whatsapp_pair
  post "/messages/whatsapp/sync", to: "messaging/whatsapp#sync", as: :whatsapp_sync
  post "/messages/whatsapp/logout", to: "messaging/whatsapp#logout", as: :whatsapp_logout
  post "/messages/whatsapp/webhook", to: "messaging/whatsapp_webhook#create", as: :whatsapp_webhook
  get "/messages/:id", to: "messages#show", as: :conversation
  post "/messages/:id", to: "messages#create", as: :send_message
  post "/messages/:id/mark_as_read", to: "messages#mark_as_read", as: :mark_conversation_as_read
  post "/messages/react/:message_id", to: "messages#react", as: :react_to_message

  get "/privacy", to: "account#privacy", as: :privacy

  get "meta_data", to: "account#show"
  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"
end
