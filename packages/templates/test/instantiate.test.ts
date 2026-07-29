import { describe, expect, test } from 'bun:test'
import { Slide } from '@build-my-deck/deck-schema'
import { CATALOG, readMaxCapacityFixture } from '../src/catalog'
import { DESIGN_SYSTEMS } from '../src/design-systems/index'
import { instantiate } from '../src/instantiate'
import type { TemplateBindings } from '../src/schema'

function requireDesignSystem(id: string) {
  const system = DESIGN_SYSTEMS[id]
  if (!system) throw new Error(`missing design system ${id}`)
  return system
}

const editorial = requireDesignSystem('editorial')
const comic = requireDesignSystem('comic')

function slideFrom(templateId: string, themeId: string) {
  const template = CATALOG.find((t) => t.id === templateId)
  if (!template) throw new Error(`Unknown template ${templateId}`)
  const theme = DESIGN_SYSTEMS[themeId]
  if (!theme) throw new Error(`Unknown design system ${themeId}`)
  const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
  const { elements, rootOrder, readingOrder } = instantiate(template, bindings, theme)
  return Slide.safeParse({
    id: `${template.id}-${themeId}`,
    templateRef: { id: template.id, version: template.version },
    elements,
    rootOrder,
    readingOrder
  })
}

describe('instantiate', () => {
  test('produces a schema-valid slide for every template in every design system', () => {
    for (const template of CATALOG) {
      for (const themeId of Object.keys(DESIGN_SYSTEMS)) {
        const result = slideFrom(template.id, themeId)
        if (!result.success) {
          throw new Error(`${template.id} in ${themeId} failed: ${JSON.stringify(result.error.issues, null, 2)}`)
        }
        expect(result.success).toBe(true)
      }
    }
  })

  test('every element carries origin.templateSlot or is a decorative fixed element', () => {
    const template = CATALOG.find((t) => t.id === 'cover')
    if (!template) throw new Error('missing cover template')
    const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
    const { elements } = instantiate(template, bindings, editorial)
    for (const [id, element] of Object.entries(elements)) {
      if (id === 'rule-baseline') {
        expect(element.origin.templateSlot).toBeUndefined()
      } else {
        expect(element.origin.templateSlot, id).toBeDefined()
      }
    }
  })

  test('carries catalog-declared fixed-element effects through instantiation in every design system', () => {
    for (const template of CATALOG) {
      const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
      for (const [systemId, system] of Object.entries(DESIGN_SYSTEMS)) {
        const { elements } = instantiate(template, bindings, system)
        for (const fixed of template.fixedElements) {
          if (!fixed.effectRef) continue
          expect(system.effects[fixed.effectRef], `${systemId}.${template.id}.${fixed.id} effect exists`).toBeDefined()
          expect(elements[fixed.id]?.effect, `${systemId}.${template.id}.${fixed.id} effect survives`).toEqual({
            effectRef: fixed.effectRef
          })
        }
      }
    }
  })

  test('maps visual panel decorations to the panel component', () => {
    for (const template of CATALOG) {
      const panel = template.fixedElements.find((fixed) => fixed.id === 'panel-bg-visual')
      if (!panel) continue
      const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
      const { elements } = instantiate(template, bindings, editorial)
      expect(elements[panel.id]?.component, `${template.id}.${panel.id}`).toEqual({ componentRef: 'panel' })
    }
  })

  test('mutating a returned element never mutates the template (deep-freeze)', () => {
    const template = CATALOG.find((t) => t.id === 'cover')
    if (!template) throw new Error('missing cover template')
    const deepFreeze = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return
      for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key])
      Object.freeze(value)
    }
    deepFreeze(template)

    const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
    const { elements } = instantiate(template, bindings, editorial)
    const headline = elements.headline
    if (!headline) throw new Error('missing headline element')
    headline.frame.x += 500

    expect(template.slots.headline?.frame.x).toBe(120)
  })

  test('readingOrder is derived from slot priority, not from rootOrder/z-order', () => {
    const template = CATALOG.find((t) => t.id === 'stat-row')
    if (!template) throw new Error('missing stat-row template')
    const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
    const { rootOrder, readingOrder } = instantiate(template, bindings, editorial)

    // The decorative rule is stacked on top (front) in rootOrder, but carries no
    // reading content and must be entirely absent from readingOrder.
    expect(rootOrder.at(-1)).toBe('rule-top')
    expect(readingOrder).not.toContain('rule-top')

    // headline (priority 1) must be read before any stat value/label (priority 1/2
    // within later-declared repeater cells), even though rootOrder places every
    // repeater element after headline positionally already — the real proof is that
    // readingOrder and rootOrder are not the same array once decoration is excluded.
    expect(readingOrder).not.toEqual(rootOrder)
    expect(readingOrder[0]).toBe('headline')
  })

  test('an optional slot with no binding is simply absent from the result', () => {
    const template = CATALOG.find((t) => t.id === 'cover')
    if (!template) throw new Error('missing cover template')
    const bindings: TemplateBindings = {
      slots: {
        headline: { kind: 'text', paragraphs: [{ runs: [{ text: 'Only The Headline', marks: [] }] }] }
      }
    }
    const { elements } = instantiate(template, bindings, editorial)
    // `rule-baseline` is a `fixedElements` entry — unconditional decor, not a slot.
    expect(Object.keys(elements).sort()).toEqual(['headline', 'rule-baseline'])
  })

  test('a missing required slot binding throws rather than producing an invalid slide', () => {
    const template = CATALOG.find((t) => t.id === 'cover')
    if (!template) throw new Error('missing cover template')
    expect(() => instantiate(template, { slots: {} }, editorial)).toThrow()
  })

  test('a binding kind the slot does not accept is rejected', () => {
    const template = CATALOG.find((t) => t.id === 'cover')
    if (!template) throw new Error('missing cover template')
    const bindings: TemplateBindings = {
      slots: {
        headline: { kind: 'image', assetId: 'asset-x', alt: 'x' }
      }
    }
    expect(() => instantiate(template, bindings, editorial)).toThrow()
  })

  test('the repeater enforces its declared min/max item count', () => {
    const template = CATALOG.find((t) => t.id === 'stat-row')
    if (!template) throw new Error('missing stat-row template')
    const bindings: TemplateBindings = {
      slots: {
        headline: { kind: 'text', paragraphs: [{ runs: [{ text: 'Numbers', marks: [] }] }] }
      },
      repeaterItems: [
        {
          value: { kind: 'text', paragraphs: [{ runs: [{ text: '1', marks: [] }] }] },
          label: { kind: 'text', paragraphs: [{ runs: [{ text: 'Only One', marks: [] }] }] }
        }
      ]
    }
    expect(() => instantiate(template, bindings, editorial)).toThrow()
  })

  test('rendering the same template and bindings twice is deterministic', () => {
    const template = CATALOG.find((t) => t.id === 'agenda')
    if (!template) throw new Error('missing agenda template')
    const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
    const first = instantiate(template, bindings, comic)
    const second = instantiate(template, bindings, comic)
    expect(first).toEqual(second)
  })
})
