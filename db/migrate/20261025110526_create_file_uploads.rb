class CreateFileUploads < ActiveRecord::Migration[8.0]
  def change
    create_table :file_uploads do |t|
      t.timestamps
      t.string :path
      t.string :message_id
    end
  end
end
