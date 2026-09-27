module Banking
  module Connection
    def self.key_path
      Rails.root.join(ENV.fetch("BANKING_KEY_PATH")).to_s
    end
  end
end
