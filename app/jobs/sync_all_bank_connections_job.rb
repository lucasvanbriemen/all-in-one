class SyncAllBankConnectionsJob < ApplicationJob
  queue_as :default

  def perform
    Bank::Connection.active.pluck(:id).each { |id| SyncBankConnectionJob.perform_later(id) }
  end
end
