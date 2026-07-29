import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FONT_ASSETS, fontFaceCss } from '../src/fonts'

const FONTS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts')

describe('fonts', () => {
  test('every declared font asset exists on disk with a matching content hash', () => {
    for (const asset of FONT_ASSETS) {
      const path = join(FONTS_ROOT, asset.file)
      const bytes = readFileSync(path)
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
      expect(hash, asset.file).toBe(asset.contentHash)
      expect(asset.file, asset.file).toContain(asset.contentHash)
    }
  })

  test('fontFaceCss references only local paths, never a CDN', () => {
    const css = fontFaceCss()
    expect(css).not.toContain('http://')
    expect(css).not.toContain('https://')
    expect(css).not.toContain('fonts.googleapis.com')
    expect(css).not.toContain('fonts.gstatic.com')
    for (const asset of FONT_ASSETS) {
      expect(css).toContain(asset.file)
    }
  })
})
