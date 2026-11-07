class AddChannelThreadCreatedIndexToMessages < ActiveRecord::Migration[8.0]
  def change
    add_index :messages, [ :channel_id, :thread_id, :created_at ], name: "index_messages_on_channel_thread_created"
  end
end
