import { deckStageCss } from './deck-stage.css'

const DESIGN_W_DEFAULT = 1920
const DESIGN_H_DEFAULT = 1080
const STORAGE_PREFIX = 'deck-stage:slide:'
const OVERLAY_HIDE_MS = 1800

export const DECK_STAGE_VALIDATION_RULES = 'no_overflowing_text,no_overlapping_text,slide_sized_text'

const pad2 = (value: number) => String(value).padStart(2, '0')

type SlideChangeReason = 'api' | 'click' | 'init' | 'keyboard' | 'tap'

type ApplyIndexOptions = {
  broadcast?: boolean
  reason?: SlideChangeReason
  showOverlay?: boolean
}

export class DeckStage extends HTMLElement {
  static get observedAttributes() {
    return ['width', 'height', 'noscale']
  }

  #root = this.attachShadow({ mode: 'open' })
  #index = 0
  #prevIndex: number | undefined
  #slides: Element[] = []
  #notes: unknown[] = []
  #hideTimer: ReturnType<typeof setTimeout> | undefined
  #mouseIdleTimer: ReturnType<typeof setTimeout> | undefined
  #storageKey = `${STORAGE_PREFIX}${location.pathname || '/'}`
  #canvas: HTMLDivElement | undefined
  #slot: HTMLSlotElement | undefined
  #overlay: HTMLDivElement | undefined
  #countEl: HTMLElement | undefined
  #totalEl: HTMLElement | undefined
  #readyRun = 0
  #readyScheduled = false

  #onKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    const { key } = event
    let handled = true

    if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
      this.#go(this.#index + 1, 'keyboard')
    } else if (key === 'ArrowLeft' || key === 'PageUp') {
      this.#go(this.#index - 1, 'keyboard')
    } else if (key === 'Home') {
      this.#go(0, 'keyboard')
    } else if (key === 'End') {
      this.#go(this.#slides.length - 1, 'keyboard')
    } else if (key === 'r' || key === 'R') {
      this.#go(0, 'keyboard')
    } else if (/^[0-9]$/.test(key)) {
      const index = key === '0' ? 9 : Number.parseInt(key, 10) - 1
      if (index < this.#slides.length) this.#go(index, 'keyboard')
    } else {
      handled = false
    }

    if (handled) {
      event.preventDefault()
      this.#flashOverlay()
    }
  }

  #onResize = () => this.#fit()
  #onSlotChange = () => {
    this.#collectSlides()
    this.#restoreIndex()
    this.#applyIndex({ showOverlay: false, broadcast: true, reason: 'init' })
    this.#fit()
    this.#scheduleReady()
  }
  #onMouseMove = () => this.#flashOverlay()
  #onTapBack = (event: Event) => {
    event.preventDefault()
    this.#go(this.#index - 1, 'tap')
  }
  #onTapForward = (event: Event) => {
    event.preventDefault()
    this.#go(this.#index + 1, 'tap')
  }

  get designWidth() {
    return Number.parseInt(this.getAttribute('width') ?? '', 10) || DESIGN_W_DEFAULT
  }

  get designHeight() {
    return Number.parseInt(this.getAttribute('height') ?? '', 10) || DESIGN_H_DEFAULT
  }

  get index() {
    return this.#index
  }

  get length() {
    return this.#slides.length
  }

  connectedCallback() {
    this.#render()
    this.#loadNotes()
    this.#syncPrintPageRule()
    window.addEventListener('keydown', this.#onKey)
    window.addEventListener('resize', this.#onResize)
    window.addEventListener('mousemove', this.#onMouseMove, { passive: true })
    this.#scheduleReady()
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.#onKey)
    window.removeEventListener('resize', this.#onResize)
    window.removeEventListener('mousemove', this.#onMouseMove)
    if (this.#hideTimer) clearTimeout(this.#hideTimer)
    if (this.#mouseIdleTimer) clearTimeout(this.#mouseIdleTimer)
  }

  attributeChangedCallback() {
    if (!this.#canvas) return

    this.#canvas.style.width = `${this.designWidth}px`
    this.#canvas.style.height = `${this.designHeight}px`
    this.#canvas.style.setProperty('--deck-design-w', `${this.designWidth}px`)
    this.#canvas.style.setProperty('--deck-design-h', `${this.designHeight}px`)
    this.#fit()
    this.#syncPrintPageRule()
  }

  goTo(index: number) {
    this.#go(index, 'api')
  }

  next() {
    this.#go(this.#index + 1, 'api')
  }

  prev() {
    this.#go(this.#index - 1, 'api')
  }

  reset() {
    this.#go(0, 'api')
  }

  #render() {
    const style = document.createElement('style')
    style.textContent = deckStageCss

    const stage = document.createElement('div')
    stage.className = 'stage'

    const canvas = document.createElement('div')
    canvas.className = 'canvas'
    canvas.style.width = `${this.designWidth}px`
    canvas.style.height = `${this.designHeight}px`
    canvas.style.setProperty('--deck-design-w', `${this.designWidth}px`)
    canvas.style.setProperty('--deck-design-h', `${this.designHeight}px`)

    const slot = document.createElement('slot')
    slot.addEventListener('slotchange', this.#onSlotChange)
    canvas.appendChild(slot)
    stage.appendChild(canvas)

    const tapzones = document.createElement('div')
    tapzones.className = 'tapzones export-hidden'
    tapzones.setAttribute('aria-hidden', 'true')
    const tapBack = document.createElement('div')
    tapBack.className = 'tapzone tapzone--back'
    const tapMiddle = document.createElement('div')
    tapMiddle.className = 'tapzone tapzone--mid'
    tapMiddle.style.pointerEvents = 'none'
    const tapForward = document.createElement('div')
    tapForward.className = 'tapzone tapzone--fwd'
    tapBack.addEventListener('click', this.#onTapBack)
    tapForward.addEventListener('click', this.#onTapForward)
    tapzones.append(tapBack, tapMiddle, tapForward)

    const overlay = document.createElement('div')
    overlay.className = 'overlay export-hidden'
    overlay.setAttribute('role', 'toolbar')
    overlay.setAttribute('aria-label', 'Deck controls')
    overlay.innerHTML = `
      <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
      </button>
      <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
      <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
      </button>
      <span class="divider"></span>
      <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
    `

    overlay.querySelector('.prev')?.addEventListener('click', () => this.#go(this.#index - 1, 'click'))
    overlay.querySelector('.next')?.addEventListener('click', () => this.#go(this.#index + 1, 'click'))
    overlay.querySelector('.reset')?.addEventListener('click', () => this.#go(0, 'click'))

    this.#root.append(style, stage, tapzones, overlay)
    this.#canvas = canvas
    this.#slot = slot
    this.#overlay = overlay
    this.#countEl = overlay.querySelector<HTMLElement>('.current') ?? undefined
    this.#totalEl = overlay.querySelector<HTMLElement>('.total') ?? undefined
  }

  #syncPrintPageRule() {
    const id = 'deck-stage-print-page'
    let style = document.getElementById(id) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = `@page { size: ${this.designWidth}px ${this.designHeight}px; margin: 0; } @media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`
  }

  #collectSlides() {
    const assigned = this.#slot?.assignedElements({ flatten: true }) ?? []
    this.#slides = assigned.filter((element) => !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(element.tagName))

    this.#slides.forEach((slide, index) => {
      const position = index + 1
      let label = slide.getAttribute('data-label')
      if (!label) {
        const existing = slide.getAttribute('data-screen-label')
        if (existing) label = existing.replace(/^\s*\d+\s*/, '').trim() || existing
      }
      if (!label) {
        const heading = slide.querySelector('h1, h2, h3, [data-title]')
        if (heading) label = (heading.textContent ?? '').trim().slice(0, 40)
      }
      slide.setAttribute('data-screen-label', `${pad2(position)} ${label || 'Slide'}`)
      if (!slide.hasAttribute('data-om-validate')) slide.setAttribute('data-om-validate', DECK_STAGE_VALIDATION_RULES)
      slide.setAttribute('data-deck-slide', String(index))
    })

    if (this.#totalEl) this.#totalEl.textContent = String(this.#slides.length || 1)
    if (this.#index >= this.#slides.length) this.#index = Math.max(0, this.#slides.length - 1)
  }

  #loadNotes() {
    const notes = document.getElementById('speaker-notes')
    if (!notes) {
      this.#notes = []
      return
    }
    try {
      const parsed: unknown = JSON.parse(notes.textContent ?? '[]')
      this.#notes = Array.isArray(parsed) ? parsed : []
    } catch {
      console.warn('[deck-stage] Failed to parse #speaker-notes JSON')
      this.#notes = []
    }
  }

  #restoreIndex() {
    try {
      const raw = localStorage.getItem(this.#storageKey)
      if (raw === null) return
      const index = Number.parseInt(raw, 10)
      if (Number.isFinite(index) && index >= 0 && index < this.#slides.length) this.#index = index
    } catch {}
  }

  #persistIndex() {
    try {
      localStorage.setItem(this.#storageKey, String(this.#index))
    } catch {}
  }

  #applyIndex({ showOverlay = true, broadcast = true, reason = 'init' }: ApplyIndexOptions = {}) {
    if (!this.#slides.length) return
    const previousIndex = this.#prevIndex ?? -1
    const currentIndex = this.#index
    this.#slides.forEach((slide, index) => {
      if (index === currentIndex) slide.setAttribute('data-deck-active', '')
      else slide.removeAttribute('data-deck-active')
    })
    if (this.#countEl) this.#countEl.textContent = String(currentIndex + 1)
    this.#persistIndex()

    if (broadcast) {
      window.postMessage({ slideIndexChanged: currentIndex }, '*')
      this.dispatchEvent(
        new CustomEvent('slidechange', {
          bubbles: true,
          composed: true,
          detail: {
            index: currentIndex,
            previousIndex,
            total: this.#slides.length,
            slide: this.#slides[currentIndex] ?? null,
            previousSlide: previousIndex >= 0 ? (this.#slides[previousIndex] ?? null) : null,
            reason
          }
        })
      )
    }

    this.#prevIndex = currentIndex
    if (showOverlay) this.#flashOverlay()
  }

  #flashOverlay() {
    if (!this.#overlay) return
    this.#overlay.setAttribute('data-visible', '')
    if (this.#hideTimer) clearTimeout(this.#hideTimer)
    this.#hideTimer = setTimeout(() => this.#overlay?.removeAttribute('data-visible'), OVERLAY_HIDE_MS)
  }

  #fit() {
    if (!this.#canvas) return
    if (this.hasAttribute('noscale')) {
      this.#canvas.style.transform = 'none'
      return
    }
    const scale = Math.min(window.innerWidth / this.designWidth, window.innerHeight / this.designHeight)
    this.#canvas.style.transform = `scale(${scale})`
  }

  #go(index: number, reason: SlideChangeReason) {
    if (!this.#slides.length) return
    const clampedIndex = Math.max(0, Math.min(this.#slides.length - 1, index))
    if (clampedIndex === this.#index) {
      this.#flashOverlay()
      return
    }
    this.#index = clampedIndex
    this.#applyIndex({ showOverlay: true, broadcast: true, reason })
  }

  #scheduleReady() {
    if (this.#readyScheduled) return
    this.#readyScheduled = true
    queueMicrotask(() => {
      this.#readyScheduled = false
      void this.#markReadyAfterLayout()
    })
  }

  async #markReadyAfterLayout() {
    const run = ++this.#readyRun
    this.removeAttribute('data-deck-ready')
    await document.fonts?.ready
    await Promise.all(Array.from(this.querySelectorAll('img'), (image) => image.decode().catch(() => undefined)))
    await Promise.all(
      Array.from(this.querySelectorAll<SVGImageElement>('svg image'), (image) => this.#waitForSvgImage(image))
    )
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (run !== this.#readyRun || !this.isConnected) return
    this.setAttribute('data-deck-ready', '')
    this.dispatchEvent(new CustomEvent('deck-stage:ready', { bubbles: true, composed: true }))
  }

  #waitForSvgImage(image: SVGImageElement) {
    const decodable = image as unknown as { decode?: () => Promise<void> }
    if (typeof decodable.decode === 'function') return decodable.decode().catch(() => undefined)
    return new Promise<void>((resolve) => {
      image.addEventListener('error', () => resolve(), { once: true })
      image.addEventListener('load', () => resolve(), { once: true })
    })
  }
}

if (!customElements.get('deck-stage')) customElements.define('deck-stage', DeckStage)
