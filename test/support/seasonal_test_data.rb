# A little bit of everything the seasonal features read, all inside 2026.
module SeasonalTestData
  ME = "31600000000@s.whatsapp.net".freeze
  MAM = "31611111111@s.whatsapp.net".freeze
  GROUP = "120363000000000000@g.us".freeze

  # The music test DB keeps a few songs around; the test transaction brings them back.
  def clear_music_data
    Music::PlaylistSong.delete_all
    Music::Playlist.delete_all
    Music::Play.delete_all
    Music::Song.delete_all
  end

  def seed_seasonal_data
    clear_music_data
    christmas_eve = Time.zone.local(2026, 12, 24, 20)

    Whatsapp::Connection.current.update!(me_jid: ME)
    me = Whatsapp::Contact.create!(id: ME, name: "Me")
    mam = Whatsapp::Contact.create!(id: MAM, name: "Mam")
    dm = Whatsapp::Channel.create!(id: MAM, contact: mam, is_dm: true, is_group_chat: false)
    group = Whatsapp::Channel.create!(id: GROUP, name: "Family", is_group_chat: true)
    12.times { |i| Whatsapp::Message.create!(id: "dm#{i}", channel: dm, contact: me, body: "Hoi 😂 #{i}", created_at: Time.zone.local(2026, 6, 1, 1 + i)) }
    Whatsapp::Message.create!(id: "xmas", channel: dm, contact: me, body: "Fijne feestdagen! 🎄", created_at: christmas_eve)
    3.times { |i| Whatsapp::Message.create!(id: "g#{i}", channel: group, contact: mam, body: "Eten!", created_at: christmas_eve - i.days) }

    sender = Sender.create!(email: "deals@bol.com", name: "Bol.com")
    3.times { |i| Email.create!(subject: "Black Friday: 50% korting", html_body: "", profile_id: 1, sender: sender, created_at: Time.zone.local(2026, 11, 20 + i)) }
    Email.create!(subject: "Your invoice", html_body: "", profile_id: 1, sender: sender, created_at: Time.zone.local(2026, 3, 1))

    song = Music::Song.create!(id: "dQw4w9WgXcQ", title: "Last Christmas", artist: "Wham!", album: "Music from the Edge of Heaven", image_url: "x", duration: 260, is_liked: true, created_at: Time.zone.local(2026, 5, 1))
    Music::Song.create!(id: "abc", title: "Mr. Brightside", artist: "The Killers", album: "Hot Fuss", image_url: "x", duration: 222)
    4.times { |i| Music::Play.create!(song: song, seconds_played: 3600, created_at: Time.zone.local(2026, 7, 1, i)) }

    account = Bank::Connection.create!(session_id: "s", aspsp_name: "ING", aspsp_country: "NL", valid_until: 1.year.from_now)
      .accounts.create!(uid: "u", iban: "NL00INGB0000000000", currency: "EUR")
    [
      [ "Albert Heijn 1234", -45.5, "Groceries" ], [ "Shell Utrecht", -80, "Fuel" ], [ "Pathe Utrecht", -14, "Cinema" ],
      [ "Bol.com", -60, "Gifts" ], [ "Oranje spaarrekening X", -500, "Savings" ]
    ].each_with_index do |(name, amount, category), i|
      account.transactions.create!(entry_reference: "t#{i}", booking_date: Date.new(2026, 12, 3), amount: amount, currency: "EUR",
        status: "BOOK", counterparty_name: name, category: category, updated_at: Time.zone.local(2026, 12, 3))
    end

    Reminder.create!(title: "Buy tree", completed: true, updated_at: Time.zone.local(2026, 12, 5))
    Notification.create!(title: "Mail", body: "Hi", source: "email.home.1", read: true, created_at: Time.zone.local(2026, 4, 1))
  end
end
