import { describe, expect, test } from 'bun:test'
import { buildCatalogManifest, catalogManifestJson } from '../src/manifest'

describe('catalog manifest', () => {
  test('lists the 8 model-selectable templates and excludes the 2 dense variants', () => {
    const manifest = buildCatalogManifest()
    expect(manifest.length).toBe(8)
    expect(manifest.some((e) => e.id === 'problem-dense')).toBe(false)
    expect(manifest.some((e) => e.id === 'two-column-dense')).toBe(false)
  })

  test('is under 2KB', () => {
    const bytes = new TextEncoder().encode(catalogManifestJson()).length
    expect(bytes).toBeLessThan(2048)
  })

  test('exposes only id, intents and slot budgets — never coordinates, style refs, or line-wrap/variant metadata', () => {
    const manifest = buildCatalogManifest()
    const json = JSON.stringify(manifest)
    expect(json).not.toContain('"frame"')
    expect(json).not.toContain('"typeRef"')
    expect(json).not.toContain('"colorRef"')
    expect(json).not.toContain('"x":')
    expect(json).not.toContain('maxLines')
    expect(json).not.toContain('compatibleVariants')
    for (const entry of manifest) {
      expect(entry.id).toBeTruthy()
      expect(entry.intents.length).toBeGreaterThan(0)
      expect(Object.keys(entry.slots).length).toBeGreaterThan(0)
    }
  })
})
