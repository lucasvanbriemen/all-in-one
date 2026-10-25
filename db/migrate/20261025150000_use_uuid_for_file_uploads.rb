class UseUuidForFileUploads < ActiveRecord::Migration[8.0]
  def up
    execute "ALTER TABLE file_uploads MODIFY id VARCHAR(36) NOT NULL"
    # MySQL's UUID() is time-based (v1) and guessable, so use random v4 ids.
    select_values("SELECT id FROM file_uploads").each do |old_id|
      execute "UPDATE file_uploads SET id = #{quote(SecureRandom.uuid)} WHERE id = #{quote(old_id)}"
    end

    add_column :file_uploads, :name, :string
    add_column :file_uploads, :mimetype, :string
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
