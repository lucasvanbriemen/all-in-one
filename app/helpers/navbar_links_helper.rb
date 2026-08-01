module NavbarLinksHelper
  def navbar_links
    [
      MailboxConfig::GROUPS.map do |group|
        { name: group[:name], href: mailbox_path(group[:path]), active: current_page?(mailbox_path(group[:path])) }
      end
    ].flatten
  end
end
