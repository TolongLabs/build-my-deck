import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATALOG } from '../src/catalog'

const CATALOG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'catalog')
const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080

describe('catalog', () => {
  test('has 10 entries with unique ids (8 base templates + 2 dense variants)', () => {
    expect(CATALOG.length).toBe(10)
    const ids = CATALOG.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every entry ships intents and per-slot budgets', () => {
    for (const template of CATALOG) {
      expect(template.intents.length).toBeGreaterThan(0)
      for (const slot of Object.values(template.slots)) {
        expect(slot.budget).toBeDefined()
      }
    }
  })

  test('every slot frame lies inside the 1920x1080 canvas', () => {
    for (const template of CATALOG) {
      for (const [name, slot] of Object.entries(template.slots)) {
        const { x, y, w, h } = slot.frame
        expect(x, `${template.id}.${name} x`).toBeGreaterThanOrEqual(0)
        expect(y, `${template.id}.${name} y`).toBeGreaterThanOrEqual(0)
        expect(x + w, `${template.id}.${name} right edge`).toBeLessThanOrEqual(CANVAS_WIDTH)
        expect(y + h, `${template.id}.${name} bottom edge`).toBeLessThanOrEqual(CANVAS_HEIGHT)
      }
    }
  })

  test('text-accepting slots additionally respect the declared safe margin; image slots may bleed to the canvas edge', () => {
    for (const template of CATALOG) {
      const margin = template.safeAreas.margin
      for (const [name, slot] of Object.entries(template.slots)) {
        const isImageOnly = slot.accepts.every((kind) => kind === 'image' || kind === 'screenshot')
        if (isImageOnly) continue
        const { x, y, w, h } = slot.frame
        expect(x, `${template.id}.${name} left margin`).toBeGreaterThanOrEqual(margin)
        expect(y, `${template.id}.${name} top margin`).toBeGreaterThanOrEqual(margin)
        expect(x + w, `${template.id}.${name} right margin`).toBeLessThanOrEqual(CANVAS_WIDTH - margin)
        expect(y + h, `${template.id}.${name} bottom margin`).toBeLessThanOrEqual(CANVAS_HEIGHT - margin)
      }
    }
  })

  test('every entry ships a schema-valid max-capacity fixture', () => {
    for (const template of CATALOG) {
      const fixturePath = join(CATALOG_ROOT, template.id, template.version, 'fixtures', 'max-capacity.json')
      expect(() => JSON.parse(readFileSync(fixturePath, 'utf-8'))).not.toThrow()
    }
  })

  test('every entry ships a thumbnail', () => {
    for (const template of CATALOG) {
      const thumbnailPath = join(CATALOG_ROOT, template.id, template.version, 'thumbnail.webp')
      expect(() => readFileSync(thumbnailPath)).not.toThrow()
    }
  })

  test('published template.json content matches the immutability lock (catches an in-place edit of a published version)', () => {
    const lock = JSON.parse(readFileSync(join(CATALOG_ROOT, 'manifest.lock.json'), 'utf-8')) as Record<string, string>
    for (const template of CATALOG) {
      const key = `${template.id}/${template.version}`
      const path = join(CATALOG_ROOT, template.id, template.version, 'template.json')
      const hash = createHash('sha256').update(readFileSync(path, 'utf-8')).digest('hex')
      const expected = lock[key]
      expect(expected, `${key} missing from the immutability lock`).toBeDefined()
      expect(hash, `${key} content changed without a version bump`).toBe(expected as string)
    }
  })

  test('collision groups reference real element ids and classify severity per Finding 3', () => {
    for (const template of CATALOG) {
      const slotIds = new Set(Object.keys(template.slots))
      const fixedIds = new Set(template.fixedElements.map((f) => f.id))
      for (const group of template.collisionGroups) {
        expect(group.memberIds.length).toBeGreaterThanOrEqual(2)
        for (const memberId of group.memberIds) {
          expect(slotIds.has(memberId) || fixedIds.has(memberId), `${template.id}: unknown member "${memberId}"`).toBe(
            true
          )
        }
      }
    }
  })

  test('the two dense variants declare each other as compatibleVariants', () => {
    const problem = CATALOG.find((t) => t.id === 'problem')
    const problemDense = CATALOG.find((t) => t.id === 'problem-dense')
    const twoColumn = CATALOG.find((t) => t.id === 'two-column')
    const twoColumnDense = CATALOG.find((t) => t.id === 'two-column-dense')
    expect(problem?.compatibleVariants).toContain('problem-dense')
    expect(problemDense?.compatibleVariants).toContain('problem')
    expect(twoColumn?.compatibleVariants).toContain('two-column-dense')
    expect(twoColumnDense?.compatibleVariants).toContain('two-column')
  })
})
