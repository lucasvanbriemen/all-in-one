module EmailsHelper
  # Appended to sandboxed srcdoc frames so they can report their content
  # height to the iframe-resize Stimulus controller. The sandbox lacks
  # allow-same-origin (on purpose), so postMessage is the only channel out.
  #
  # Deliberately not html_safe: inside the srcdoc attribute it must be
  # HTML-escaped along with the email body — the browser decodes it back.
  IFRAME_RESIZE_SCRIPT = <<~HTML.freeze
    <script>
      new ResizeObserver(() => {
        parent.postMessage({ emailHeight: document.documentElement.scrollHeight }, "*")
      }).observe(document.documentElement)
    </script>
  HTML

  def iframe_resize_script
    IFRAME_RESIZE_SCRIPT
  end
end
