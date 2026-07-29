import { describe, expect, test } from 'bun:test'
import type { Deck, ThemeSpec } from '@build-my-deck/deck-schema'
import { renderToStaticMarkup } from 'react-dom/server'
import { SlideView, renderDeckToHtml, resolveComponentStyle, resolveEffectStyle, themeToCss } from '../src/index'

const deck = (): Deck => ({
  schemaVersion: 2,
  documentId: 'renderer-fixture',
  revision: 0,
  canvas: { width: 1920, height: 1080, printWidthIn: 13.333, printHeightIn: 7.5 },
  metadata: { generation: { state: 'complete', flags: [] } },
  theme: {
    id: 'light',
    version: '1',
    typeStyles: {
      headline: {
        fontFamily: 'Inter',
        fontSize: 72,
        lineHeight: 1.1,
        letterSpacing: -1,
        fontWeight: 700,
        color: '#101010'
      },
      body: {
        fontFamily: 'Inter',
        fontSize: 30,
        lineHeight: 1.35,
        letterSpacing: 0,
        fontWeight: 400,
        color: '#202020'
      }
    },
    colorRoles: { paper: '#FFFFFF', ink: '#101010', accent: '#FF3366' }
  },
  assets: {
    logo: { id: 'logo', mediaType: 'image/svg+xml', contentHash: 'sha256:logo' },
    photo: { id: 'photo', mediaType: 'image/png', contentHash: 'sha256:photo' }
  },
  slides: [
    {
      id: 'slide-1',
      elements: {
        background: {
          id: 'background',
          kind: 'shape',
          semanticRole: 'decoration',
          frame: { x: 0, y: 0, w: 1920, h: 1080, rotation: 0 },
          opacity: 1,
          visible: true,
          locked: true,
          priority: 0,
          origin: { userOverrides: [] },
          style: { colorRef: 'paper' },
          shape: 'rectangle'
        },
        headline: {
          id: 'headline',
          kind: 'text',
          semanticRole: 'headline',
          frame: { x: 120, y: 120, w: 900, h: 260, rotation: 0 },
          opacity: 1,
          visible: true,
          locked: false,
          priority: 1,
          origin: { userOverrides: [] },
          style: { typeRef: 'headline' },
          content: {
            paragraphs: [
              {
                runs: [
                  { text: 'Build ', marks: [] },
                  { text: 'better', marks: ['strong'] }
                ]
              },
              { listStyle: 'bullet', runs: [{ text: 'Judge-ready output', marks: ['em'] }] }
            ]
          }
        },
        image: {
          id: 'image',
          kind: 'image',
          semanticRole: 'product screenshot',
          frame: { x: 1100, y: 120, w: 500, h: 320, rotation: 0 },
          opacity: 1,
          visible: true,
          locked: false,
          priority: 2,
          origin: { userOverrides: [] },
          style: { colorRef: 'accent' },
          assetId: 'photo'
        },
        icon: {
          id: 'icon',
          kind: 'icon',
          semanticRole: 'decoration',
          frame: { x: 120, y: 480, w: 80, h: 80, rotation: 0 },
          opacity: 1,
          visible: true,
          locked: false,
          priority: 3,
          origin: { userOverrides: [] },
          style: { colorRef: 'ink' },
          catalogRef: 'arrow-right'
        },
        svg: {
          id: 'svg',
          kind: 'svg',
          semanticRole: 'brand mark',
          frame: { x: 240, y: 480, w: 100, h: 80, rotation: 0 },
          opacity: 1,
          visible: true,
          locked: false,
          priority: 4,
          origin: { userOverrides: [] },
          style: { colorRef: 'ink' },
          assetId: 'logo'
        },
        group: {
          id: 'group',
          kind: 'group',
          semanticRole: 'content group',
          frame: { x: 400, y: 480, w: 200, h: 80, rotation: 0 },
          opacity: 1,
          visible: true,
          locked: false,
          priority: 5,
          origin: { userOverrides: [] },
          style: { colorRef: 'ink' }
        }
      },
      rootOrder: ['background', 'headline', 'image', 'icon', 'svg', 'group'],
      readingOrder: ['headline', 'image', 'svg', 'group']
    }
  ]
})

describe('the single renderer', () => {
  test('renders every document element exactly once with document ids and native text semantics', () => {
    const fixture = deck()
    const slide = fixture.slides[0]
    if (!slide) throw new Error('fixture slide is required')

    const html = renderToStaticMarkup(<SlideView slide={slide} theme={fixture.theme} />)

    for (const elementId of Object.keys(slide.elements)) {
      expect(html.match(new RegExp(`data-element-id=\"${elementId}\"`, 'g'))).toHaveLength(1)
    }
    expect([...html.matchAll(/data-element-id="([^"]+)"/g)].map((match) => match[1])).toEqual([
      'headline',
      'image',
      'svg',
      'group',
      'background',
      'icon'
    ])
    expect(html).not.toContain('role="group"')
    expect(html).not.toContain('tabindex="0"')
    expect(html).toContain('<h1')
    expect(html).toContain('<strong>better</strong>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>')
    expect(html).toContain('<em>Judge-ready output</em>')
    expect(html).toContain('data-asset-id="photo"')
    expect(html).toContain('data-catalog-ref="arrow-right"')
  })

  test('resolves theme roles and element overrides without changing document elements', () => {
    const fixture = deck()
    const alternateTheme = structuredClone(fixture.theme)
    alternateTheme.id = 'dark'
    const headline = alternateTheme.typeStyles.headline
    if (!headline) throw new Error('headline typography role is required')
    headline.color = '#FFFFFF'
    alternateTheme.colorRoles.paper = '#101010'
    const slide = fixture.slides[0]
    if (!slide) throw new Error('fixture slide is required')

    const original = structuredClone(fixture.slides)
    const originalHtml = renderToStaticMarkup(<SlideView slide={slide} theme={fixture.theme} />)
    const reskinnedHtml = renderToStaticMarkup(<SlideView slide={slide} theme={alternateTheme} />)

    expect(themeToCss(alternateTheme)).toContain('--bmd-color-paper:#101010')
    expect(originalHtml).toContain('background-color:#FFFFFF')
    expect(reskinnedHtml).toContain('background-color:#101010')
    expect(fixture.slides).toEqual(original)
  })

  test('creates deterministic, self-contained deck HTML without URLs or markup reference injection', () => {
    const fixture = deck()
    const slide = fixture.slides[0]
    const icon = slide?.elements.icon
    const image = slide?.elements.image
    if (!icon || icon.kind !== 'icon' || !image || image.kind !== 'image') throw new Error('fixture art is required')
    icon.catalogRef = '<svg onload=alert(1)>' as never
    image.assetId = 'https://untrusted.example/image.png' as never
    const first = renderDeckToHtml(fixture)
    const second = renderDeckToHtml(fixture)

    expect(first).toBe(second)
    expect(first).toContain('<deck-stage')
    expect(first).toContain('data-catalog-ref="&lt;svg onload=alert(1)&gt;"')
    expect(first).not.toMatch(/(?:src|href)="https?:/)
    expect(first).not.toContain('<svg onload')
  })
})

describe('ThemeSpec v2 — effects and component styles reach pixels', () => {
  const themeWith = (opts: {
    haloIntensity: number
    panelBackground: string
    panelBorder: string
  }): ThemeSpec => ({
    id: 'fixture',
    version: '1',
    typeStyles: {
      body: { fontFamily: 'Inter', fontSize: 30, lineHeight: 1.35, letterSpacing: 0, fontWeight: 400 }
    },
    colorRoles: {
      ink: '#14110F',
      shadow: '#14110F',
      panel: opts.panelBackground,
      border: opts.panelBorder
    },
    componentStyles: {
      panel: { backgroundRef: 'panel', borderRef: 'border', textRef: 'body' },
      badge: { backgroundRef: 'panel', borderRef: 'border', textRef: 'body' },
      stat: { backgroundRef: 'panel', borderRef: 'border', textRef: 'body' }
    },
    effects: {
      halftone: { colorRef: 'ink', intensity: opts.haloIntensity },
      'hard-shadow': { colorRef: 'shadow', intensity: opts.haloIntensity },
      'editorial-rule': { colorRef: 'ink', intensity: opts.haloIntensity }
    }
  })

  const slideWith = (theme: ThemeSpec): Deck['slides'][number] => ({
    id: 'slide-1',
    elements: {
      panel: {
        id: 'panel',
        kind: 'shape',
        semanticRole: 'decoration',
        frame: { x: 0, y: 0, w: 400, h: 300, rotation: 0 },
        opacity: 1,
        visible: true,
        locked: false,
        priority: 0,
        origin: { userOverrides: [] },
        style: { colorRef: 'panel' },
        shape: 'rectangle',
        component: { componentRef: 'panel' },
        effect: { effectRef: 'hard-shadow' }
      }
    },
    rootOrder: ['panel'],
    readingOrder: ['panel']
  })

  test('the same element renders materially different CSS declarations under a dominant-effect theme versus a subdued one', () => {
    const dominant = themeWith({ haloIntensity: 0.85, panelBackground: '#FFE7A8', panelBorder: '#14110F' })
    const subdued = themeWith({ haloIntensity: 0.15, panelBackground: '#F1E9DC', panelBorder: '#D8CBB5' })

    const dominantHtml = renderToStaticMarkup(<SlideView slide={slideWith(dominant)} theme={dominant} />)
    const subduedHtml = renderToStaticMarkup(<SlideView slide={slideWith(subdued)} theme={subdued} />)

    // Same effect (hard-shadow), same element id, different resolved intensity/color per system.
    expect(dominantHtml).toContain('data-element-id="panel"')
    expect(dominantHtml).toMatch(/box-shadow:14px 14px 0 0 rgba\(20,17,15,0\.85\)/)
    expect(subduedHtml).toMatch(/box-shadow:4px 4px 0 0 rgba\(20,17,15,0\.15\)/)
    expect(dominantHtml).not.toContain('box-shadow:4px 4px 0 0 rgba(20,17,15,0.15)')
    expect(subduedHtml).not.toContain('box-shadow:14px 14px 0 0 rgba(20,17,15,0.85)')

    // Same component role (panel), different resolved background/border per system.
    expect(dominantHtml).toContain('background-color:#FFE7A8')
    expect(dominantHtml).toContain('border-color:#14110F')
    expect(subduedHtml).toContain('background-color:#F1E9DC')
    expect(subduedHtml).toContain('border-color:#D8CBB5')
  })

  test('themeToCss emits distinct global effect/component custom properties per theme', () => {
    const dominant = themeWith({ haloIntensity: 0.9, panelBackground: '#FFE7A8', panelBorder: '#14110F' })
    const subdued = themeWith({ haloIntensity: 0.08, panelBackground: '#F1E9DC', panelBorder: '#D8CBB5' })

    expect(themeToCss(dominant)).toContain('--bmd-effect-halftone-intensity:0.9')
    expect(themeToCss(subdued)).toContain('--bmd-effect-halftone-intensity:0.08')
    expect(themeToCss(dominant)).toContain('--bmd-component-panel-background:#FFE7A8')
    expect(themeToCss(subdued)).toContain('--bmd-component-panel-background:#F1E9DC')
  })

  test('resolving an effect or component role the theme does not declare throws rather than silently rendering nothing', () => {
    const theme = themeWith({ haloIntensity: 0.5, panelBackground: '#FFFFFF', panelBorder: '#000000' })
    const bareTheme: ThemeSpec = { id: 'bare', version: '1', typeStyles: {}, colorRoles: {} }

    expect(() => resolveEffectStyle(bareTheme, { effectRef: 'halftone' })).toThrow(/Unknown effect role/)
    expect(() => resolveComponentStyle(bareTheme, 'panel')).toThrow(/Unknown component style role/)
    expect(resolveEffectStyle(theme, { effectRef: 'halftone' }).intensity).toBe(0.5)
    expect(resolveEffectStyle(theme, { effectRef: 'halftone', overrides: { intensity: 0.2 } }).intensity).toBe(0.2)
  })
})
