module ServerData
  extend self

  MEMORY_THRESHOLD_MEDIUM = 50.freeze
  MEMORY_THRESHOLD_HIGH = 90.freeze
  DISK_THRESHOLD_MEDIUM = 75.freeze
  DISK_THRESHOLD_HIGH = 90.freeze

  WHATSAPP_UNHAPPY_STATUS = [ "pairing", "needs_relink" ]

  QUEUE_BACKLOG_THRESHOLD_MEDIUM = 50.freeze
  QUEUE_BACKLOG_THRESHOLD_HIGH = 200.freeze

  # Mailboxes are polled every IMAP_FETCH_INTERVAL_SECONDS (15s), so a few
  # minutes without a successful fetch already means something is wrong.
  IMAP_STALE_AFTER = 5.minutes.freeze

  # Sent messages per mailbox in the last 24h before it counts as suspicious.
  SENT_EMAILS_THRESHOLD = 10.freeze

  def all
    failed_jobs = self.failed_jobs
    queue_backlog = self.queue_backlog
    workers_alive = self.workers_alive
    failing_mailboxes = self.failing_mailboxes
    busy_senders = self.busy_senders

    [
      {
        label: "CPU count",
        value: cpu_count
      },
      {
        label: "Memory usage",
        value: memory,
        importance_level: get_importance_level(memory, MEMORY_THRESHOLD_MEDIUM, MEMORY_THRESHOLD_HIGH)
      },
      {
        label: "Disk usage",
        value: disk,
        importance_level: get_importance_level(disk, DISK_THRESHOLD_MEDIUM, DISK_THRESHOLD_HIGH)
      },
      {
        label: "Uptime",
        value: uptime_seconds
      },
      {
        label: "WhatsApp unpaired",
        value: Whatsapp::Connection.current.pairing_code,
        importance_level: WHATSAPP_UNHAPPY_STATUS.include?(Whatsapp::Connection.current.status) ? "high" : "low",
        should_show: WHATSAPP_UNHAPPY_STATUS.include?(Whatsapp::Connection.current.status)
      },
      {
        label: "Bank unpaired",
        value: "Bank needs to be resynced",
        importance_level: "high",
        should_show: Bank::Connection.active.none?
      },
      {
        label: "Mailbox failing",
        value: failing_mailboxes.join(", "),
        importance_level: "high",
        should_show: failing_mailboxes.any?
      },
      {
        label: "Sending lots of mail",
        value: busy_senders.join(", "),
        importance_level: "high",
        should_show: busy_senders.any?
      },
      {
        label: "Failed jobs",
        value: failed_jobs,
        importance_level: failed_jobs.to_i.positive? ? "high" : "low",
        should_show: failed_jobs > QUEUE_BACKLOG_THRESHOLD_MEDIUM
      },
      {
        label: "Queue backlog",
        value: queue_backlog,
        importance_level: get_importance_level(queue_backlog, QUEUE_BACKLOG_THRESHOLD_MEDIUM, QUEUE_BACKLOG_THRESHOLD_HIGH),
        should_show: queue_backlog > QUEUE_BACKLOG_THRESHOLD_MEDIUM
      },
      {
        label: "Job workers alive",
        value: workers_alive,
        importance_level: workers_alive.to_i.zero? ? "high" : "low",
        should_show: workers_alive.nil?
      }
    ]
  end

  def platform
    RbConfig::CONFIG["host_os"]
  end

  def linux?
    platform.include?("linux")
  end

  def macos?
    platform.include?("darwin")
  end

  def cpu_count
    if linux?
      sh("nproc")&.to_i
    elsif macos?
      sh("sysctl -n hw.ncpu")&.to_i
    end
  end

  def memory
    if linux?
      info = File.read("/proc/meminfo").scan(/^(\w+):\s+(\d+) kB$/).to_h
      total = info["MemTotal"].to_i * 1024
      available = info["MemAvailable"].to_i * 1024
      get_percentage(total - available, total)
    elsif macos?
      total = sh("sysctl -n hw.memsize")&.to_i
      return nil if total.nil?

      page_size = sh("sysctl -n hw.pagesize").to_i
      pages = sh("vm_stat").to_s.scan(/^Pages (free|inactive|speculative):\s+(\d+)\./).to_h
      available = pages.values.sum(&:to_i) * page_size
      get_percentage(total - available, total)
    end
  end

  def disk
    output = sh("df -Pk #{Shellwords.escape(Rails.root.to_s)}")
    return nil if output.blank?

    total, used, available = output.lines.last.split[1..3].map { |kb| kb.to_i * 1024 }
    # { total: total, used: used, available: available }
    get_percentage(used, total)
  end

  def uptime_seconds
    if linux?
      time = File.read("/proc/uptime").split.first.to_f
    elsif macos?
      boot = sh("sysctl -n kern.boottime").to_s[/sec = (\d+)/, 1]
      time = Time.now.to_i - boot.to_i if boot
    end

    TimeConversion.seconds_to_human_readable(time)
  end

  # A failed fetch records the error but leaves last_fetched_at alone, so a
  # stale timestamp catches both erroring mailboxes and ones nothing is
  # fetching at all (dead worker, broken recurring job).
  def failing_mailboxes
    ImapCredential.where(last_fetched_at: nil)
      .or(ImapCredential.where(last_fetched_at: ...IMAP_STALE_AFTER.ago))
      .or(ImapCredential.where.not(last_fetch_error: nil))
      .map do |credential|
        reason = credential.last_fetch_error&.truncate(80) ||
          "no fetch for #{credential.last_fetched_at ? TimeConversion.seconds_to_human_readable(Time.current - credential.last_fetched_at) : "ever"}"
        "#{credential.username} (#{reason})"
      end
  end

  # Counts come from CountSentImapEmailsJob; a mailbox it hasn't counted (yet)
  # simply isn't listed.
  def busy_senders
    ImapCredential.all.filter_map do |credential|
      count = Rails.cache.read(CountSentImapEmailsJob.cache_key(credential.id))
      "#{credential.username} (#{count} in 24h)" if count.to_i >= SENT_EMAILS_THRESHOLD
    end
  end

  def failed_jobs
    solid_queue { SolidQueue::FailedExecution.count }
  end

  def queue_backlog
    solid_queue { SolidQueue::ReadyExecution.count }
  end

  # Solid Queue workers heartbeat every minute, and Solid Queue itself only
  # considers a process dead after process_alive_threshold (5 min by default),
  # so a 1-minute cutoff would flap between heartbeats.
  def workers_alive
    solid_queue do
      SolidQueue::Process
        .where(kind: "Worker")
        .where("last_heartbeat_at > ?", SolidQueue.process_alive_threshold.ago)
        .count
    end
  end

  private
    # Solid Queue only runs in production; elsewhere its tables don't exist,
    # so return nil and let the entry hide itself.
    def solid_queue
      yield
    rescue ActiveRecord::ActiveRecordError
      nil
    end

    def sh(command)
      output = `#{command} 2>/dev/null`
      $?.success? ? output.strip : nil
    end

    def get_percentage(value, total)
      return nil if value.nil? || total.nil? || total.zero?
      raw_float = value.to_f / total.to_f * 100
      "#{raw_float.round(2)}%"
    end

    def get_importance_level(value, medium_threshold, high_threshold)
      value = value.to_f

      return "low" if value.nil?
      return "high" if value >= high_threshold
      return "medium" if value >= medium_threshold
      "low"
    end
end
