import type { Element as DeckElement, Frame } from '@build-my-deck/deck-schema'
import type {
  DesignSystem,
  RepeaterBindings,
  SlotAccepts,
  SlotBinding,
  StyleRef,
  Template,
  TemplateBindings,
  TemplateSlot
} from './schema'

export type InstantiateResult = {
  elements: Record<string, DeckElement>
  rootOrder: string[]
  readingOrder: string[]
}

const cloneFrame = (frame: Frame): Frame => ({ ...frame })

type PriorityEntry = { id: string; priority: number; order: number }

function baseFields(id: string, semanticRole: string, frame: Frame, priority: number, templateSlot?: string) {
  return {
    id,
    semanticRole,
    frame: cloneFrame(frame),
    opacity: 1,
    visible: true,
    locked: false,
    priority,
    origin: { templateSlot, userOverrides: [] as string[] }
  }
}

function assertAccepted(slotLabel: string, accepts: SlotAccepts[], binding: SlotBinding | undefined): SlotBinding {
  if (!binding) throw new Error(`Missing binding for required slot "${slotLabel}"`)
  if (!accepts.includes(binding.kind)) {
    throw new Error(`Slot "${slotLabel}" does not accept binding kind "${binding.kind}"`)
  }
  return binding
}

/** Turns one bound slot into one or more detached, schema-valid elements. */
function elementsForSlot(
  slotId: string,
  frame: Frame,
  priority: number,
  style: StyleRef,
  binding: SlotBinding
): { elements: DeckElement[]; readingIds: string[] } {
  const { typeRef, colorRef, componentRef, secondaryTypeRef } = style
  const component = componentRef ? { component: { componentRef } } : {}

  if (binding.kind === 'text') {
    if (!typeRef) throw new Error(`Slot "${slotId}" accepts text but declares no typeRef`)
    const element: DeckElement = {
      ...baseFields(slotId, slotId, frame, priority, slotId),
      ...component,
      kind: 'text',
      style: { typeRef },
      content: { paragraphs: binding.paragraphs }
    }
    return { elements: [element], readingIds: [slotId] }
  }

  if (binding.kind === 'stat') {
    if (!typeRef) throw new Error(`Slot "${slotId}" accepts stat but declares no typeRef`)
    const valueId = `${slotId}-value`
    const labelId = `${slotId}-label`
    const value: DeckElement = {
      ...baseFields(valueId, `${slotId}-value`, frame, priority, slotId),
      ...component,
      kind: 'text',
      style: { typeRef },
      content: { paragraphs: [{ runs: [{ text: binding.value, marks: [] }] }] }
    }
    const label: DeckElement = {
      ...baseFields(labelId, `${slotId}-label`, frame, priority + 1, slotId),
      ...component,
      kind: 'text',
      style: { typeRef },
      content: { paragraphs: [{ runs: [{ text: binding.label, marks: [] }] }] }
    }
    return { elements: [value, label], readingIds: [valueId, labelId] }
  }

  if (binding.kind === 'quote') {
    if (!typeRef) throw new Error(`Slot "${slotId}" accepts quote but declares no typeRef`)
    const quoteId = `${slotId}-quote`
    const quote: DeckElement = {
      ...baseFields(quoteId, `${slotId}-quote`, frame, priority, slotId),
      ...component,
      kind: 'text',
      style: { typeRef },
      content: { paragraphs: [{ runs: [{ text: binding.quote, marks: ['em'] }] }] }
    }
    if (!binding.attribution) return { elements: [quote], readingIds: [quoteId] }
    const attributionId = `${slotId}-attribution`
    const attribution: DeckElement = {
      ...baseFields(attributionId, `${slotId}-attribution`, frame, priority + 1, slotId),
      ...component,
      kind: 'text',
      style: { typeRef: secondaryTypeRef ?? typeRef },
      content: { paragraphs: [{ runs: [{ text: binding.attribution, marks: [] }] }] }
    }
    return { elements: [quote, attribution], readingIds: [quoteId, attributionId] }
  }

  // image | screenshot
  if (!colorRef) throw new Error(`Slot "${slotId}" accepts an image but declares no colorRef`)
  const element: DeckElement = {
    ...baseFields(slotId, slotId, frame, priority, slotId),
    ...component,
    kind: 'image',
    style: { colorRef },
    assetId: binding.assetId
  }
  return { elements: [element], readingIds: [slotId] }
}

function fixedToElement(fixed: Template['fixedElements'][number]): DeckElement {
  const base = baseFields(fixed.id, `decor-${fixed.id}`, fixed.frame, 0, undefined)
  const effect = fixed.effectRef ? { effect: { effectRef: fixed.effectRef } } : {}
  const component = fixed.style.componentRef ? { component: { componentRef: fixed.style.componentRef } } : {}
  if (!fixed.style.colorRef) throw new Error(`Fixed element "${fixed.id}" declares no colorRef`)
  if (fixed.kind === 'icon') {
    if (!fixed.catalogRef) throw new Error(`Fixed icon element "${fixed.id}" declares no catalogRef`)
    return {
      ...base,
      ...effect,
      ...component,
      kind: 'icon',
      style: { colorRef: fixed.style.colorRef },
      catalogRef: fixed.catalogRef
    }
  }
  if (!fixed.shape) throw new Error(`Fixed shape element "${fixed.id}" declares no shape`)
  return {
    ...base,
    ...effect,
    ...component,
    kind: 'shape',
    style: { colorRef: fixed.style.colorRef },
    shape: fixed.shape
  }
}

function repeaterElements(
  template: Template,
  repeaterItems: RepeaterBindings | undefined,
  nextOrder: () => number
): { elements: DeckElement[]; readingEntries: PriorityEntry[] } {
  const repeater = template.repeater
  if (!repeater) return { elements: [], readingEntries: [] }
  const items = repeaterItems ?? []
  if (items.length < repeater.min || items.length > repeater.max) {
    throw new Error(
      `Repeater "${repeater.id}" requires between ${repeater.min} and ${repeater.max} items, got ${items.length}`
    )
  }

  const elements: DeckElement[] = []
  const readingEntries: PriorityEntry[] = []

  items.forEach((itemBindings, index) => {
    const cellX =
      repeater.direction === 'row' ? repeater.startX + index * (repeater.cellWidth + repeater.gap) : repeater.startX
    const cellY =
      repeater.direction === 'column' ? repeater.y + index * (repeater.cellHeight + repeater.gap) : repeater.y
    for (const itemSlot of repeater.itemSlots) {
      const slotId = `${repeater.id}-${index}-${itemSlot.name}`
      const binding = assertAccepted(slotId, itemSlot.accepts, itemBindings[itemSlot.name])
      const frame: Frame = {
        x: cellX + itemSlot.frame.x,
        y: cellY + itemSlot.frame.y,
        w: itemSlot.frame.w,
        h: itemSlot.frame.h,
        rotation: itemSlot.frame.rotation
      }
      const { elements: itemElements, readingIds } = elementsForSlot(
        slotId,
        frame,
        itemSlot.priority,
        itemSlot.style,
        binding
      )
      elements.push(...itemElements)
      for (const id of readingIds) readingEntries.push({ id, priority: itemSlot.priority, order: nextOrder() })
    }
  })

  return { elements, readingEntries }
}

/**
 * Binds typed slots to content and produces detached, schema-valid slide
 * contents. Elements are freshly cloned — mutating the result never mutates
 * `template` (proven by a deep-freeze test). `origin.templateSlot` records
 * provenance per element (Q6); the caller sets `Slide.templateRef`.
 *
 * `readingOrder` is derived from each slot's declared `priority`, never from
 * z-order: purely decorative `fixedElements` carry no reading content at all
 * and are simply absent from `readingOrder` (task 8 marks them `aria-hidden`).
 */
export function instantiate(template: Template, bindings: TemplateBindings, _theme: DesignSystem): InstantiateResult {
  const elements: Record<string, DeckElement> = {}
  const rootOrder: string[] = []
  const readingEntries: PriorityEntry[] = []
  let orderCounter = 0
  const nextOrder = () => orderCounter++

  const behind = template.fixedElements.filter((f) => f.zOrder === 'behind')
  const front = template.fixedElements.filter((f) => f.zOrder === 'front')

  for (const fixed of behind) {
    elements[fixed.id] = fixedToElement(fixed)
    rootOrder.push(fixed.id)
  }

  for (const [slotId, slot] of Object.entries(template.slots) as [string, TemplateSlot][]) {
    const rawBinding = bindings.slots[slotId]
    if (!rawBinding) {
      if (slot.optional) continue
      throw new Error(`Missing binding for required slot "${slotId}"`)
    }
    const binding = assertAccepted(slotId, slot.accepts, rawBinding)
    const { elements: slotElements, readingIds } = elementsForSlot(
      slotId,
      slot.frame,
      slot.priority,
      slot.style,
      binding
    )
    for (const element of slotElements) {
      elements[element.id] = element
      rootOrder.push(element.id)
    }
    for (const id of readingIds) readingEntries.push({ id, priority: slot.priority, order: nextOrder() })
  }

  const { elements: repeated, readingEntries: repeaterReading } = repeaterElements(
    template,
    bindings.repeaterItems,
    nextOrder
  )
  for (const element of repeated) {
    elements[element.id] = element
    rootOrder.push(element.id)
  }
  readingEntries.push(...repeaterReading)

  for (const fixed of front) {
    elements[fixed.id] = fixedToElement(fixed)
    rootOrder.push(fixed.id)
  }

  const readingOrder = readingEntries
    .slice()
    .sort((a, b) => a.priority - b.priority || a.order - b.order)
    .map((entry) => entry.id)

  return { elements, rootOrder, readingOrder }
}
