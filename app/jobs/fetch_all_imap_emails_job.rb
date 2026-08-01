# Recurring fan-out: enqueue one fetch job per IMAP credential so inboxes
# are fetched in parallel and independently (see config/recurring.yml).
class FetchAllImapEmailsJob < ApplicationJob
  queue_as :default

  def perform
    ImapCredential.find_each do |credential|
      FetchImapEmailsJob.perform_later(credential.id)
    end
  end
end
