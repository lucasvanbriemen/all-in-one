Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.

  get "/email/:path", to: "emails#index", as: :mailbox
  get "/emails/:id", to: "emails#show", as: :email
  post "/emails/:id/mark_as_read", to: "emails#mark_as_read", as: :mark_email_as_read

  get "/server_data", to: "server#index", as: :server_data
  get "/notifications", to: "notification#index", as: :notifications
  get "/music", to: "music#index", as: :music
  get "/music/search", to: "music#search", as: :search
  get "/get-mp3/:isrc", to: "music#show", as: :get_mp3, constraints: { isrc: /[^\/]+/ }
  post "/music/:id/toggle_favorite", to: "music#toggle_favorite", as: :toggle_music_favorite
  post "/notifications/:id/mark_as_read", to: "notification#update", as: :mark_notification_as_read
  post "/device_tokens", to: "device_tokens#create", as: :device_tokens
  delete "/device_tokens/:id", to: "device_tokens#destroy", as: :device_token, constraints: { id: /[^\/]+/ }

  get "meta_data", to: "account#show"
  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"
end
