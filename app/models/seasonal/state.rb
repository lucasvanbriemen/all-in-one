module Seasonal
  # A small JSON object the app keeps between sessions (opened doors, ticked
  # gifts, ...). It lives in a file rather than a table; keys are flat strings
  # such as "advent.opened".
  class State
    class Invalid < StandardError; end

    KEY_FORMAT = /\A[a-z0-9_.-]{1,80}\z/i
    MAX_BYTES = 256.kilobytes
    MUTEX = Mutex.new

    class_attribute :path, default: Rails.root.join("storage", "seasonal_state.json")

    def read
      File.exist?(path) ? JSON.parse(File.read(path)) : {}
    rescue JSON::ParserError
      {}
    end

    # Merges one key and returns the whole object. The file lock covers other
    # processes (Puma workers), the mutex other threads in this one.
    def write(key, value)
      raise Invalid, "invalid key" unless key.is_a?(String) && key.match?(KEY_FORMAT)

      MUTEX.synchronize do
        FileUtils.mkdir_p(File.dirname(path))
        File.open("#{path}.lock", File::RDWR | File::CREAT, 0o644) do |lock|
          lock.flock(File::LOCK_EX)

          state = read.merge(key => value)
          json = JSON.generate(state)
          raise Invalid, "state too large" if json.bytesize > MAX_BYTES

          temp = "#{path}.#{Process.pid}.#{Thread.current.object_id}.tmp"
          File.write(temp, json)
          File.rename(temp, path)
          state
        end
      end
    end
  end
end
