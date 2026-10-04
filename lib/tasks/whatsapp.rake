namespace :whatsapp do
  desc "Merge chats, messages and contacts stored under a WhatsApp privacy id (lid) into their phone jid"
  task merge_lids: :environment do
    before = Whatsapp::Chat.where("jid LIKE '%@lid'").count
    Whatsapp::LidMerge.backfill
    after = Whatsapp::Chat.where("jid LIKE '%@lid'").count
    puts "lid chats: #{before} -> #{after}"
  end
end
