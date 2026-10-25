class AddExternalIdToFileUploads < ActiveRecord::Migration[8.0]
  def change
    add_column :file_uploads, :external_id, :string
    add_index :file_uploads, [ :message_id, :external_id ], unique: true
  end
end
