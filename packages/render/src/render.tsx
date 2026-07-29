import type { Deck, Element, Slide, ThemeSpec } from '@build-my-deck/deck-schema'
import type { CSSProperties } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ElementContent, elementIsDecoration } from './elements'
import { effectToCssProperties, resolveComponentStyle, resolveEffectStyle, themeToCss } from './theme-to-css'

const STATIC_DECK_CSS = `
html,body{margin:0;background:#111}deck-stage{display:block;position:relative;width:1920px;height:1080px;margin:0 auto;background:#fff;overflow:hidden}.bmd-slide{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden}.bmd-element{box-sizing:border-box;overflow:hidden;display:block}.bmd-element[aria-hidden=true]{pointer-events:none}.bmd-text-content{height:100%;overflow-wrap:anywhere}.bmd-text-content :is(h1,h2,h3,p){margin:0}.bmd-text-content :is(ul,ol){margin:0;padding-inline-start:1.2em}.bmd-image,.bmd-icon,.bmd-svg,.bmd-icon svg,.bmd-svg svg{display:block;width:100%;height:100%}.bmd-shape{width:100%;height:100%}.bmd-shape-ellipse{border-radius:50%}.bmd-shape-line{height:1px;position:absolute;top:50%;left:0;right:0}.bmd-group{width:100%;height:100%;border:1px solid}@media print{html,body{background:none}deck-stage{width:auto;height:auto;margin:0;background:none;overflow:visible}.bmd-slide{position:relative;break-after:page;page-break-after:always}.bmd-slide:last-child{break-after:auto;page-break-after:auto}}`

const frameStyle = (element: Element, zIndex: number, theme: ThemeSpec): CSSProperties => {
  const style: CSSProperties = {
    display: element.visible ? 'block' : 'none',
    height: `${element.frame.h}px`,
    left: `${element.frame.x}px`,
    opacity: element.opacity,
    order: zIndex,
    position: 'absolute',
    top: `${element.frame.y}px`,
    transform: `rotate(${element.frame.rotation}deg)`,
    transformOrigin: 'center center',
    width: `${element.frame.w}px`,
    zIndex
  }
  if (element.component) {
    const resolved = resolveComponentStyle(theme, element.component.componentRef)
    style.backgroundColor = resolved.background
    style.borderColor = resolved.border
    style.borderStyle = 'solid'
    style.borderWidth = '2px'
  }
  if (element.effect) {
    Object.assign(style, effectToCssProperties(element.effect.effectRef, resolveEffectStyle(theme, element.effect)))
  }
  return style
}

const visualOrder = (slide: Slide) => new Map(slide.rootOrder.map((elementId, index) => [elementId, index]))

const domOrder = (slide: Slide) => [
  ...slide.readingOrder,
  ...slide.rootOrder.filter((elementId) => !slide.readingOrder.includes(elementId))
]

export function SlideView({ slide, theme }: { slide: Slide; theme: ThemeSpec }) {
  const zIndices = visualOrder(slide)
  return (
    <section className="bmd-slide" data-slide-id={slide.id} aria-label={`Slide ${slide.id}`}>
      {domOrder(slide).map((elementId) => {
        const element = slide.elements[elementId]
        if (!element) throw new Error(`Unknown element id in reading order: ${elementId}`)
        const zIndex = zIndices.get(elementId)
        if (zIndex === undefined) throw new Error(`Element missing from root order: ${elementId}`)
        const decoration = elementIsDecoration(element.semanticRole)
        return (
          <div
            key={element.id}
            className="bmd-element"
            data-element-id={element.id}
            aria-hidden={decoration || undefined}
            style={frameStyle(element, zIndex, theme)}
          >
            <ElementContent element={element} theme={theme} />
          </div>
        )
      })}
    </section>
  )
}

export function DeckView({ deck }: { deck: Deck }) {
  return (
    <>
      {deck.slides.map((slide) => (
        <SlideView key={slide.id} slide={slide} theme={deck.theme} />
      ))}
    </>
  )
}

export function renderDeckToHtml(deck: Deck): string {
  const body = renderToStaticMarkup(<DeckView deck={deck} />)
  const title = renderToStaticMarkup(<title>{deck.metadata.title ?? 'Deck'}</title>)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${title}<style>${themeToCss(deck.theme)}${STATIC_DECK_CSS}</style></head><body><deck-stage>${body}</deck-stage><script>document.querySelector('deck-stage')?.dispatchEvent(new CustomEvent('deck-stage:ready',{bubbles:true,composed:true}))</script></body></html>`
}
