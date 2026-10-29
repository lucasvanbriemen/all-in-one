module Whatsapp
  # WhatsApp addresses a person by phone jid (…@s.whatsapp.net) or privacy id (…@lid). Events that arrive before the
  # connector knows the mapping are stored under the lid, which leaves a second chat and contact for the same person.
  # Once the mapping is known, fold everything under the lid into the phone jid.
  class LidMerge
    def self.call(lid:, phone:) = new(lid, phone).call

    def initialize(lid, phone)
      @lid = lid
      @phone = phone
    end

    # Foreign keys point at contacts and channels, so the phone-jid rows are created first, every reference is moved
    # over, and only then are the lid rows removed.
    def call
      return if @lid.blank? || @phone.blank? || @lid == @phone

      ::Channel.transaction do
        merge_contacts
        merge_channels
      end
    end

    # Resolves every stored lid for which a contact mapping is already known.
    def self.backfill
      Contact.where.not(lid: nil).where("id NOT LIKE '%@lid'").pluck(:lid, :id).each { |lid, phone| call(lid: lid, phone: phone) }
    end

    private

    def merge_contacts
      lid_contact = Contact.find_by(id: @lid)
      phone_contact = Contact.find_or_initialize_by(id: @phone)
      return if lid_contact.nil? && phone_contact.new_record?

      phone_contact.lid = @lid
      phone_contact.name = lid_contact.name if phone_contact.name.blank? && lid_contact
      phone_contact.avatar_url = lid_contact.avatar_url if phone_contact.avatar_url.blank? && lid_contact
      phone_contact.save!
      return unless lid_contact

      Message.where(contact_id: @lid).update_all(contact_id: @phone)
      ::Channel.where(contact_id: @lid).update_all(contact_id: @phone)
      # Someone reacting under both ids is one reaction; keep the phone-jid one.
      MessageReaction.where(contact_id: @lid, message_id: MessageReaction.where(contact_id: @phone).pluck(:message_id)).delete_all
      MessageReaction.where(contact_id: @lid).update_all(contact_id: @phone)
      lid_contact.delete
    end

    def merge_channels
      lid_channel = Channel.find_by(id: @lid)
      return unless lid_channel

      phone_channel = Channel.find_or_initialize_by(id: @phone)
      phone_channel.assign_attributes(
        name: phone_channel.name.presence || lid_channel.name,
        avatar_url: phone_channel[:avatar_url].presence || lid_channel[:avatar_url],
        is_active: phone_channel.new_record? ? lid_channel.is_active : phone_channel.is_active || lid_channel.is_active,
        is_dm: true,
        is_group_chat: false,
        contact_id: @phone
      )
      phone_channel.save!

      Message.where(channel_id: @lid).update_all(channel_id: @phone)
      lid_channel.delete
    end
  end
end
