# Runs a command to completion, killing it if it outlives timeout_seconds.
# Returns the exit status, or nil when the process had to be killed.
module Music
  module TimedProcess
    POLL_INTERVAL_SECONDS = 0.2

    def self.run(*command, env: {}, timeout_seconds:, out: File::NULL, err: File::NULL, chdir: nil)
      options = { out: out, err: err }
      options[:chdir] = chdir if chdir
      wait(Process.spawn(env, *command, **options), timeout_seconds: timeout_seconds)
    end

    def self.wait(pid, timeout_seconds:)
      deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout_seconds

      loop do
        _, status = Process.wait2(pid, Process::WNOHANG)
        return status if status

        if Process.clock_gettime(Process::CLOCK_MONOTONIC) >= deadline
          Process.kill("KILL", pid)
          Process.wait(pid)
          return nil
        end

        sleep POLL_INTERVAL_SECONDS
      end
    end
    private_class_method :wait
  end
end
