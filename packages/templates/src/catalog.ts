import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Template as TemplateSchema } from './schema'
import type { StyleRef, Template } from './schema'

/**
 * Versioned, immutable catalog directories: `catalog/<id>/<version>/template.json`.
 * Read as plain text rather than a static JSON import so this package needs
 * no `resolveJsonModule` compiler flag anywhere in the shared root
 * `tsconfig.base.json` (out of this task's file scope).
 */
const CATALOG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'catalog')

const ENTRIES: readonly [id: string, version: string][] = [
  ['cover', '1'],
  ['agenda', '1'],
  ['problem', '1'],
  ['problem-dense', '1'],
  ['one-big-claim', '1'],
  ['two-column', '1'],
  ['two-column-dense', '1'],
  ['stat-row', '1'],
  ['full-bleed-visual', '1'],
  ['closing', '1']
]

function readTemplateJson(id: string, version: string): unknown {
  const path = join(CATALOG_ROOT, id, version, 'template.json')
  return JSON.parse(readFileSync(path, 'utf-8'))
}

export function readMaxCapacityFixture(id: string, version: string): unknown {
  const path = join(CATALOG_ROOT, id, version, 'fixtures', 'max-capacity.json')
  return JSON.parse(readFileSync(path, 'utf-8'))
}

/** Every catalog entry is validated at import time — a malformed template fails the module graph. */
export const CATALOG: readonly Template[] = ENTRIES.map(([id, version]) =>
  TemplateSchema.parse(readTemplateJson(id, version))
)

export const CATALOG_BY_ID: Record<string, Template> = Object.fromEntries(CATALOG.map((t) => [t.id, t]))

const seenIds = new Set<string>()
for (const template of CATALOG) {
  if (seenIds.has(template.id)) throw new Error(`Duplicate template id in catalog: ${template.id}`)
  seenIds.add(template.id)
}

export type StyleRefUsage = { typeRefs: string[]; colorRefs: string[] }

function collect(style: StyleRef, into: { typeRefs: Set<string>; colorRefs: Set<string> }) {
  if (style.typeRef) into.typeRefs.add(style.typeRef)
  if (style.secondaryTypeRef) into.typeRefs.add(style.secondaryTypeRef)
  if (style.colorRef) into.colorRefs.add(style.colorRef)
}

/** Every `typeRef`/`colorRef` a template's slots, fixed elements and repeater cells cite. */
export function styleRefsUsedBy(template: Template): StyleRefUsage {
  const typeRefs = new Set<string>()
  const colorRefs = new Set<string>()
  const into = { typeRefs, colorRefs }

  for (const slot of Object.values(template.slots)) collect(slot.style, into)
  for (const fixed of template.fixedElements) collect(fixed.style, into)
  if (template.repeater) {
    for (const itemSlot of template.repeater.itemSlots) collect(itemSlot.style, into)
  }

  return { typeRefs: [...typeRefs], colorRefs: [...colorRefs] }
}
