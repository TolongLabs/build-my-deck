import { describe, expect, test } from 'bun:test'
import * as schema from '../src/index'

const validDeck = (): schema.Deck => ({
  schemaVersion: 2,
  documentId: 'deck-1',
  revision: 0,
  canvas: {
    width: 1920,
    height: 1080,
    printWidthIn: 13.333,
    printHeightIn: 7.5
  },
  metadata: {
    title: 'Launch',
    generation: {
      state: 'complete',
      flags: []
    }
  },
  theme: {
    id: 'editorial',
    version: '1',
    typeStyles: {
      headline: {
        fontFamily: 'Newsreader',
        fontSize: 72,
        lineHeight: 1,
        letterSpacing: 0,
        fontWeight: 700,
        color: '#101010'
      }
    },
    colorRoles: {
      ink: '#101010',
      paper: '#FFFFFF'
    }
  },
  assets: {
    'asset-1': {
      id: 'asset-1',
      mediaType: 'image/png',
      contentHash: 'sha256:abc'
    }
  },
  slides: [
    {
      id: 'slide-1',
      templateRef: { id: 'cover', version: '1' },
      elements: {
        'text-1': {
          id: 'text-1',
          kind: 'text',
          semanticRole: 'headline',
          frame: { x: 120, y: 180, w: 1100, h: 240, rotation: 0 },
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
              {
                listStyle: 'bullet',
                runs: [{ text: 'A judge-ready deck', marks: ['em'] }]
              }
            ]
          }
        }
      },
      rootOrder: ['text-1'],
      readingOrder: ['text-1']
    }
  ]
})

describe('deck schema', () => {
  test('exports the canonical Deck schema', () => {
    expect(schema.Deck).toBeDefined()
  })

  test('validates a versioned deck and rejects one without a schema version', () => {
    const deck = schema.Deck.parse(validDeck())
    const physicalPointsPerDesignPixel = (deck.canvas.printWidthIn * 72) / deck.canvas.width

    expect(deck).toMatchObject({ schemaVersion: 2 })
    expect(physicalPointsPerDesignPixel).toBeCloseTo(0.5, 3)
    const { schemaVersion: _schemaVersion, ...withoutVersion } = validDeck()
    expect(() => schema.Deck.parse(withoutVersion)).toThrow()
  })

  test('preserves generation state while rejecting provider leakage', () => {
    const partialDeck = validDeck()
    partialDeck.metadata.generation = {
      state: 'partial',
      flags: ['run_budget_exceeded', 'validation_failed']
    }

    expect(schema.Deck.parse(partialDeck).metadata.generation).toEqual(partialDeck.metadata.generation)
    expect(() => schema.Deck.parse({ ...partialDeck, providerResponse: { secret: 'nope' } })).toThrow()
  })

  test('keeps stable keyed elements while validating independent order arrays', () => {
    const deck = validDeck()
    const slide = deck.slides[0]
    if (!slide) throw new Error('fixture slide is required')

    slide.elements['shape-1'] = {
      id: 'shape-1',
      kind: 'shape',
      semanticRole: 'background',
      frame: { x: 0, y: 0, w: 1920, h: 1080, rotation: 0 },
      opacity: 1,
      visible: true,
      locked: true,
      priority: 0,
      origin: { userOverrides: [] },
      style: { colorRef: 'paper' },
      shape: 'rectangle'
    }
    slide.rootOrder = ['shape-1', 'text-1']
    slide.readingOrder = ['text-1', 'shape-1']

    expect(schema.Deck.parse(deck).slides[0]?.readingOrder).toEqual(['text-1', 'shape-1'])
    slide.rootOrder = ['missing-element']
    expect(() => schema.Deck.parse(deck)).toThrow()
  })

  test('rejects unknown element kinds, markup fields, bare colors, and viewport geometry', () => {
    const deck = validDeck()
    const slide = deck.slides[0]
    if (!slide) throw new Error('fixture slide is required')
    const text = slide.elements['text-1']
    if (!text) throw new Error('fixture element is required')

    expect(() => schema.Element.parse({ ...text, kind: 'html' })).toThrow()
    expect(() => schema.Element.parse({ ...text, markup: '<svg />' })).toThrow()
    expect(() => schema.Element.parse({ ...text, style: { typeRef: 'headline', color: '#FF00FF' } })).toThrow()
    expect(() => schema.Element.parse({ ...text, frame: { ...text.frame, x: '50%' } })).toThrow()
  })

  test('provides structural references for icons, SVG assets, and diagrams', () => {
    const base = validDeck().slides[0]?.elements['text-1']
    if (!base || base.kind !== 'text') throw new Error('fixture text element is required')
    const { content: _content, ...elementBase } = base

    expect(
      schema.Element.parse({
        ...elementBase,
        id: 'icon-1',
        kind: 'icon',
        style: { colorRef: 'ink' },
        catalogRef: 'arrow-right'
      }).kind
    ).toBe('icon')
    expect(
      schema.Element.parse({
        ...elementBase,
        id: 'svg-1',
        kind: 'svg',
        style: { colorRef: 'ink' },
        assetId: 'asset-1'
      }).kind
    ).toBe('svg')
    expect(
      schema.Element.parse({
        ...elementBase,
        id: 'diagram-1',
        kind: 'diagram',
        style: { colorRef: 'ink' },
        diagram: {
          nodes: [{ id: 'node-1', label: 'Input', styleRef: 'headline' }],
          ports: [{ id: 'port-1', nodeId: 'node-1', name: 'out' }],
          edges: [],
          labels: [],
          styleRefs: ['headline']
        }
      }).kind
    ).toBe('diagram')
  })

  test('rejects unsafe catalog, asset, and diagram style references', () => {
    const base = validDeck().slides[0]?.elements['text-1']
    if (!base || base.kind !== 'text') throw new Error('fixture text element is required')
    const { content: _content, ...elementBase } = base

    for (const assetId of [
      'data:image/svg+xml,<svg onload=alert(1)>',
      'https://evil.example/whatever',
      'http://evil.example/whatever',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'custom:reference',
      'asset/path',
      'asset\\path',
      'asset..path',
      'asset path',
      '"asset"',
      '<asset>',
      'asset\nid'
    ]) {
      expect(() =>
        schema.Element.parse({
          ...elementBase,
          id: 'svg-1',
          kind: 'svg',
          style: { colorRef: 'ink' },
          assetId
        })
      ).toThrow()
    }

    expect(() =>
      schema.Element.parse({
        ...elementBase,
        id: 'icon-1',
        kind: 'icon',
        style: { colorRef: 'ink' },
        catalogRef: '../../../etc/passwd'
      })
    ).toThrow()
    expect(() =>
      schema.DiagramSpec.parse({
        nodes: [{ id: 'node-1', styleRef: 'https://evil.example/style' }],
        ports: [],
        edges: [],
        labels: [],
        styleRefs: ['style..ref']
      })
    ).toThrow()
  })

  test('accepts opaque catalog and asset identifier shapes', () => {
    expect(schema.AssetId.parse('asset.logo-v2_2026.07')).toBe('asset.logo-v2_2026.07')
    expect(schema.ElementId.parse('slide_2-title')).toBe('slide_2-title')
    expect(
      schema.DiagramSpec.parse({
        nodes: [{ id: 'node.primary-1', styleRef: 'diagram-style_v2.1' }],
        ports: [{ id: 'port_out-1', nodeId: 'node.primary-1', name: 'output_1' }],
        edges: [{ id: 'edge-1', fromPortId: 'port_out-1', toPortId: 'port_out-1', styleRef: 'line-style' }],
        labels: [{ id: 'label-1', text: 'Output', targetId: 'node.primary-1', styleRef: 'caption_1' }],
        styleRefs: ['diagram-style_v2.1', 'line-style', 'caption_1']
      })
    ).toMatchObject({ styleRefs: ['diagram-style_v2.1', 'line-style', 'caption_1'] })
  })

  test('defaults override protection paths and preserves dotted paths', () => {
    const element = validDeck().slides[0]?.elements['text-1']
    if (!element) throw new Error('fixture element is required')

    const defaulted = schema.Element.parse({ ...element, origin: {} })
    expect(defaulted.origin.userOverrides).toEqual([])
    expect(
      schema.Element.parse({ ...element, origin: { userOverrides: ['style.overrides.fontSize'] } }).origin.userOverrides
    ).toEqual(['style.overrides.fontSize'])
  })

  test('migrates an immutable v0 snapshot and retains Zod issue paths', () => {
    const v0Deck = validDeck()
    const { schemaVersion: _schemaVersion, ...withoutVersion } = v0Deck
    const snapshot = structuredClone(withoutVersion)

    expect(schema.migrate(withoutVersion)).toMatchObject({ schemaVersion: 2 })
    expect(withoutVersion).toEqual(snapshot)

    const result = schema.safeParseDeck({ ...validDeck(), slides: [{}] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.some((issue) => issue.path[0] === 'slides')).toBe(true)
  })

  test('migrates a real v1 fixture (no componentStyles/effects) to v2 with conservative theme defaults', () => {
    const v1Deck = validDeck()
    v1Deck.schemaVersion = 1 as never
    v1Deck.theme.componentStyles = undefined
    v1Deck.theme.effects = undefined

    const migrated = schema.migrate(v1Deck)

    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.theme.effects?.halftone).toEqual({ colorRef: 'ink', intensity: 0 })
    expect(migrated.theme.effects?.['hard-shadow']).toEqual({ colorRef: 'ink', intensity: 0 })
    expect(migrated.theme.effects?.['editorial-rule']).toEqual({ colorRef: 'ink', intensity: 0 })
    expect(migrated.theme.componentStyles?.panel).toEqual({
      backgroundRef: 'ink',
      borderRef: 'ink',
      textRef: 'headline'
    })
  })

  test('a theme carrying all three effects and componentStyles round-trips through Deck.parse', () => {
    const deck = validDeck()
    deck.theme.componentStyles = {
      panel: { backgroundRef: 'ink', borderRef: 'ink', textRef: 'headline' },
      badge: { backgroundRef: 'ink', borderRef: 'ink', textRef: 'headline' },
      stat: { backgroundRef: 'ink', borderRef: 'ink', textRef: 'headline' }
    }
    deck.theme.effects = {
      halftone: { colorRef: 'ink', intensity: 0.9 },
      'hard-shadow': { colorRef: 'ink', intensity: 0.85 },
      'editorial-rule': { colorRef: 'ink', intensity: 0.2 }
    }

    const parsed = schema.Deck.parse(deck)
    expect(parsed.theme.componentStyles).toEqual(deck.theme.componentStyles)
    expect(parsed.theme.effects).toEqual(deck.theme.effects)
  })

  test('rejects an unknown effect name and an incomplete effect/componentStyle record', () => {
    const deck = validDeck()

    expect(() =>
      schema.Deck.parse({
        ...deck,
        theme: { ...deck.theme, effects: { ...conservativeEffects(), glow: { colorRef: 'ink', intensity: 0.5 } } }
      })
    ).toThrow()

    expect(() =>
      schema.Deck.parse({
        ...deck,
        theme: { ...deck.theme, effects: { halftone: { colorRef: 'ink', intensity: 0.5 } } }
      })
    ).toThrow()

    expect(() =>
      schema.Deck.parse({
        ...deck,
        theme: {
          ...deck.theme,
          componentStyles: { panel: { backgroundRef: 'ink', borderRef: 'ink', textRef: 'headline' } }
        }
      })
    ).toThrow()
  })

  test('cites effects and component styles by role — a bare effect value outside overrides is rejected', () => {
    const element = validDeck().slides[0]?.elements['text-1']
    if (!element) throw new Error('fixture element is required')

    expect(schema.Element.parse({ ...element, effect: { effectRef: 'halftone' } }).kind).toBe('text')
    expect(
      schema.Element.parse({ ...element, effect: { effectRef: 'halftone', overrides: { intensity: 0.4 } } }).kind
    ).toBe('text')
    expect(schema.Element.parse({ ...element, component: { componentRef: 'panel' } }).kind).toBe('text')

    expect(() => schema.Element.parse({ ...element, effect: { intensity: 0.4 } })).toThrow()
    expect(() => schema.Element.parse({ ...element, effect: { effectRef: 'halftone', intensity: 0.4 } })).toThrow()
    expect(() =>
      schema.Element.parse({ ...element, effect: { effectRef: 'halftone', overrides: { colorRef: 'ink' } } })
    ).toThrow()
    expect(() => schema.Element.parse({ ...element, component: { componentRef: 'glow' } })).toThrow()
    expect(() =>
      schema.Element.parse({ ...element, component: { componentRef: 'panel', backgroundRef: 'ink' } })
    ).toThrow()
  })
})

function conservativeEffects() {
  return {
    halftone: { colorRef: 'ink', intensity: 0 },
    'hard-shadow': { colorRef: 'ink', intensity: 0 },
    'editorial-rule': { colorRef: 'ink', intensity: 0 }
  }
}
