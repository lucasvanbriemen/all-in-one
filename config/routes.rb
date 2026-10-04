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

  post "/whatsapp/webhook", to: "whatsapp/webhooks#create", as: :whatsapp_webhook
  get "/whatsapp/status", to: "whatsapp#status", as: :whatsapp_status
  get "/whatsapp/pair", to: "whatsapp#pair", as: :whatsapp_pair
  get "/whatsapp/chats", to: "whatsapp#index", as: :whatsapp_chats
  get "/whatsapp/chats/:jid", to: "whatsapp#show", as: :whatsapp_chat, constraints: { jid: /[^\/]+/ }
  get "/whatsapp/chats/:jid/messages/:id/media", to: "whatsapp#media", as: :whatsapp_media, constraints: { jid: /[^\/]+/ }
  post "/whatsapp/chats/:jid/send", to: "whatsapp#send_message", as: :whatsapp_send, constraints: { jid: /[^\/]+/ }
  post "/whatsapp/chats/:jid/react", to: "whatsapp#react", as: :whatsapp_react, constraints: { jid: /[^\/]+/ }
  post "/whatsapp/chats/:jid/read", to: "whatsapp#mark_read", as: :whatsapp_read, constraints: { jid: /[^\/]+/ }
  post "/whatsapp/chats/:jid/typing", to: "whatsapp#typing", as: :whatsapp_typing, constraints: { jid: /[^\/]+/ }

  get "/privacy", to: "account#privacy", as: :privacy

  get "meta_data", to: "account#show"
  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"
end
