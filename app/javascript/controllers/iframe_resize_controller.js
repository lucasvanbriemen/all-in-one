import { Controller } from "@hotwired/stimulus"

// Grows an <iframe> to fit its content.
//
// Same-origin frames (internal emails) are measured directly via
// contentDocument. Sandboxed srcdoc frames (external emails) can't be
// reached from the parent, so they report their own height via
// postMessage — see EmailsHelper#iframe_resize_script.
export default class extends Controller {
  connect() {
    this.onMessage = (event) => {
      if (event.source !== this.element.contentWindow) return
      if (typeof event.data?.emailHeight !== "number") return

      this.resize(event.data.emailHeight)
    }
    this.onLoad = () => this.measure()

    window.addEventListener("message", this.onMessage)
    this.element.addEventListener("load", this.onLoad)
    this.measure()
  }

  disconnect() {
    window.removeEventListener("message", this.onMessage)
    this.observer?.disconnect()
  }

  measure() {
    let doc
    try {
      doc = this.element.contentDocument
    } catch {
      return
    }
    if (!doc) return // sandboxed frame: height arrives via postMessage instead

    this.resize(doc.documentElement.scrollHeight)

    // Re-measure when late-loading content (images etc.) changes the height.
    this.observer?.disconnect()
    this.observer = new ResizeObserver(() => this.resize(doc.documentElement.scrollHeight))
    this.observer.observe(doc.documentElement)
  }

  resize(height) {
    this.element.style.height = `${height}px`
  }
}
