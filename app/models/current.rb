# Per-request (and per-job) state; Rails resets it automatically in between.
class Current < ActiveSupport::CurrentAttributes
  attribute :whatsapp_me_jid, :whatsapp_my_jids
end
