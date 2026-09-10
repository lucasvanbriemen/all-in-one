module ServerData
  extend self

  MEMORY_THRESHOLD_MEDIUM = 50.freeze
  MEMORY_THRESHOLD_HIGH = 90.freeze
  DISK_THRESHOLD_MEDIUM = 75.freeze
  DISK_THRESHOLD_HIGH = 90.freeze

  def all
    [
      {
        label: "CPU count",
        value: cpu_count
      },
      {
        label: "Memory",
        value: memory,
        importance_level: get_importance_level(memory, MEMORY_THRESHOLD_MEDIUM, MEMORY_THRESHOLD_HIGH)
      },
      {
        label: "Disk",
        value: disk,
        importance_level: get_importance_level(disk, DISK_THRESHOLD_MEDIUM, DISK_THRESHOLD_HIGH)
      },
      {
        label: "Uptime (seconds)",
        value: uptime_seconds
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
      File.read("/proc/uptime").split.first.to_f
    elsif macos?
      boot = sh("sysctl -n kern.boottime").to_s[/sec = (\d+)/, 1]
      Time.now.to_i - boot.to_i if boot
    end
  end

  private
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
