module TimeConversion
  extend self

  def seconds_to_human_readable(time)
    minutes = (time / 60).to_i
    hours = (minutes / 60).to_i
    days = (hours / 24).to_i
    weeks = (days / 7).to_i
    months = (weeks / 4.5).to_i

    if months > 0
      "#{months}mo #{weeks % 4}w"
    elsif weeks > 0
      "#{weeks}w #{days % 7}d"
    elsif days > 0
      "#{days}d #{hours % 24}hr"
    elsif hours > 0
      "#{hours}hr #{minutes % 60}min"
    else
      "#{minutes} minutes"
    end
  end
end