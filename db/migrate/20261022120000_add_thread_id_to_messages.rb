class AddThreadIdToMessages < ActiveRecord::Migration[8.0]
  def change
    add_column :messages, :thread_id, :string
    add_index :messages, :thread_id
  end
end
