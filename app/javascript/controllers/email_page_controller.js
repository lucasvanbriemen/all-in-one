import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]

  select(event) {
    this.element.querySelector(".active")?.classList.remove("active")
    this.element.querySelector(".placeholder-content")?.classList.remove("placeholder-content")
    event.currentTarget.classList.add("active")
    
    fetch(`/emails/${event.params.id}`)
      .then(response => response.text())
      .then(html => {
        this.contentTarget.innerHTML = html
        this.contentTarget.classList.add("open")
      })
  }

  close() {
    this.contentTarget.classList.remove("open")
    this.element.querySelector(".active")?.classList.remove("active")
  }
}
