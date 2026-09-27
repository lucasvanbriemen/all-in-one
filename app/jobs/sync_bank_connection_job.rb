# Refreshes one bank connection. Serialized per connection so an overrunning
# sync never races a scheduled one against the same bank session.
class SyncBankConnectionJob < ApplicationJob
  queue_as :default

  limits_concurrency to: 1, key: ->(connection_id) { "bank_sync_#{connection_id}" }, duration: 15.minutes

  discard_on ActiveRecord::RecordNotFound

  def perform(connection_id)
    Banking::Sync.new(Bank::Connection.find(connection_id)).run
  end
end
