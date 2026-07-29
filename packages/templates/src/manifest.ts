import { CATALOG } from './catalog'
import type { SlotAccepts } from './schema'

export type ManifestBudget = { chars?: number; items?: number }
/** `accepts` is omitted when it is exactly `['text']` — the default. */
export type ManifestSlot = { accepts?: SlotAccepts[]; budget: ManifestBudget; optional?: true }
export type ManifestRepeater = { min: number; max: number; slots: Record<string, ManifestSlot> }
export type ManifestEntry = {
  id: string
  intents: string[]
  slots: Record<string, ManifestSlot>
  repeater?: ManifestRepeater
}

function manifestBudget(budget: { maxChars?: number; maxItems?: number }): ManifestBudget {
  const out: ManifestBudget = {}
  if (budget.maxChars !== undefined) out.chars = budget.maxChars
  if (budget.maxItems !== undefined) out.items = budget.maxItems
  return out
}

function manifestSlot(slot: {
  accepts: SlotAccepts[]
  budget: { maxChars?: number; maxItems?: number }
  optional?: boolean
}): ManifestSlot {
  const isDefaultAccepts = slot.accepts.length === 1 && slot.accepts[0] === 'text'
  const out: ManifestSlot = { budget: manifestBudget(slot.budget) }
  if (!isDefaultAccepts) out.accepts = slot.accepts
  if (slot.optional) out.optional = true
  return out
}

/**
 * The LLM-facing catalog manifest: `id`, `intents` and slot budgets only —
 * never coordinates, never style refs. This is what the pipeline (task 14)
 * injects into a generation prompt, so a model can select a template by
 * `id` and know its capacity without ever seeing geometry. `maxLines` is
 * deliberately omitted — it is a rendering/measurement-time concern (task 12's
 * auto-fit), not something the model needs to bound its own output; `chars`
 * (and `items` for lists/repeaters) is the signal that actually constrains
 * generated content length.
 *
 * Dense variants (`manifestVisible: false`) are deliberately excluded: per
 * D8, a "declared higher-capacity template variant" is something `bindSlide`
 * selects deterministically from `compatibleVariants` when standard content
 * overflows, never something the model is offered directly — carrying length
 * variants converts a would-be model round-trip into a local, free selection.
 * `CATALOG_BY_ID` still exposes every version, including variants, to that
 * deterministic selection code.
 */
export function buildCatalogManifest(): ManifestEntry[] {
  return CATALOG.filter((t) => t.manifestVisible).map((template) => ({
    id: template.id,
    intents: template.intents,
    slots: Object.fromEntries(Object.entries(template.slots).map(([name, slot]) => [name, manifestSlot(slot)])),
    repeater: template.repeater
      ? {
          min: template.repeater.min,
          max: template.repeater.max,
          slots: Object.fromEntries(template.repeater.itemSlots.map((slot) => [slot.name, manifestSlot(slot)]))
        }
      : undefined
  }))
}

export function catalogManifestJson(): string {
  return JSON.stringify(buildCatalogManifest())
}
