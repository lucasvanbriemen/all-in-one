# Recurring supervisor: makes sure every credential has a live IDLE watcher.
# Enqueues are cheap no-ops while a session is already running (see the lease
# in WatchImapMailboxJob), so this can run often enough to keep the gap after
# a session ends or crashes down to one tick.
class WatchAllImapMailboxesJob < ApplicationJob
  queue_as :default

  def perform
    ImapCredential.find_each do |credential|
      next if WatchImapMailboxJob.watching?(credential.id)

      WatchImapMailboxJob.perform_later(credential.id)
    end
  end
end
