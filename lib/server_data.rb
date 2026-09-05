module ServerData
  extend self

  def all
    {
      cpu_count: cpu_count,
      load_average: load_average,
      memory: memory,
      disk: disk,
      uptime_seconds: uptime_seconds
    }
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

  def load_average
    if linux?
      File.read("/proc/loadavg").split.first(3).map(&:to_f)
    elsif macos?
      sh("sysctl -n vm.loadavg").to_s.scan(/[\d.]+/).first(3).map(&:to_f).presence
    end
  end

  def memory
    if linux?
      info = File.read("/proc/meminfo").scan(/^(\w+):\s+(\d+) kB$/).to_h
      total = info["MemTotal"].to_i * 1024
      available = info["MemAvailable"].to_i * 1024
      { total: total, available: available, used: total - available }
    elsif macos?
      total = sh("sysctl -n hw.memsize")&.to_i
      return nil if total.nil?

      page_size = sh("sysctl -n hw.pagesize").to_i
      pages = sh("vm_stat").to_s.scan(/^Pages (free|inactive|speculative):\s+(\d+)\./).to_h
      available = pages.values.sum(&:to_i) * page_size
      { total: total, available: available, used: total - available }
    end
  end

  def disk
    output = sh("df -Pk #{Shellwords.escape(Rails.root.to_s)}")
    return nil if output.blank?

    total, used, available = output.lines.last.split[1..3].map { |kb| kb.to_i * 1024 }
    { total: total, used: used, available: available }
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
end
