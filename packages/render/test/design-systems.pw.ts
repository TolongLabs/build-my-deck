import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Deck } from '@build-my-deck/deck-schema'
import {
  CATALOG,
  brutalist,
  comic,
  editorial,
  instantiate,
  readMaxCapacityFixture,
  toThemeSpec
} from '@build-my-deck/templates'
import type { DesignSystem, TemplateBindings } from '@build-my-deck/templates'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Copied from render.pw.ts: @playwright/test unconditionally rewrites this
// worker process's jsxImportSource for every file it compiles, so render.tsx's
// own JSX breaks the moment it enters this process. Render in a clean `bun`
// subprocess instead and hand the resulting HTML string across the boundary.
const rendererEntry = fileURLToPath(new URL('../src/index.ts', import.meta.url))

function renderDeckHtml(deck: Deck): string {
  const script = `import { renderDeckToHtml } from ${JSON.stringify(rendererEntry)}; process.stdout.write(renderDeckToHtml(JSON.parse(process.argv[1])))`
  return execFileSync('bun', ['-e', script, JSON.stringify(deck)], { encoding: 'utf-8' })
}

function deckFor(templateId: string, system: DesignSystem) {
  const template = CATALOG.find((entry) => entry.id === templateId)
  if (!template) throw new Error(`missing catalog template ${templateId}`)
  const bindings = readMaxCapacityFixture(template.id, template.version) as TemplateBindings
  const { elements, rootOrder, readingOrder } = instantiate(template, bindings, system)
  return Deck.parse({
    schemaVersion: 2,
    documentId: `${template.id}-${system.id}`,
    revision: 0,
    canvas: { width: 1920, height: 1080, printWidthIn: 13.333, printHeightIn: 7.5 },
    metadata: { generation: { state: 'complete', flags: [] } },
    theme: toThemeSpec(system),
    assets: {},
    slides: [
      {
        id: `${template.id}-${system.id}`,
        templateRef: { id: template.id, version: template.version },
        elements,
        rootOrder,
        readingOrder
      }
    ]
  })
}

async function styleOf(page: Page, elementId: string): Promise<string> {
  return (await page.locator(`[data-element-id="${elementId}"]`).getAttribute('style')) ?? ''
}

function rgbaAlpha(style: string, property: 'box-shadow' | 'border-bottom' | 'background-image'): number {
  const match = style.match(new RegExp(`${property}:[^;]*rgba\\([^,]+,[^,]+,[^,]+,([\\d.]+)\\)`))
  if (!match?.[1]) throw new Error(`No ${property} rgba() declaration found in style: ${style}`)
  return Number.parseFloat(match[1])
}

test('the catalog reaches each system’s signature effect through instantiate and toThemeSpec', async ({ page }) => {
  await page.goto('/')

  const ruleStyles: Record<string, string> = {}
  for (const system of [comic, editorial, brutalist]) {
    await page.setContent(renderDeckHtml(deckFor('cover', system)))
    ruleStyles[system.id] = await styleOf(page, 'rule-baseline')
  }
  const editorialRule = rgbaAlpha(ruleStyles.editorial ?? '', 'border-bottom')
  const brutalistRule = rgbaAlpha(ruleStyles.brutalist ?? '', 'border-bottom')
  const comicRule = rgbaAlpha(ruleStyles.comic ?? '', 'border-bottom')
  expect(editorialRule).toBeGreaterThan(comicRule)
  expect(brutalistRule).toBeGreaterThan(comicRule)
  expect(editorialRule).toBeGreaterThanOrEqual(brutalistRule)

  const halftoneStyles: Record<string, string> = {}
  for (const system of [comic, editorial, brutalist]) {
    await page.setContent(renderDeckHtml(deckFor('one-big-claim', system)))
    halftoneStyles[system.id] = await styleOf(page, 'claim-decor')
  }
  const comicHalftone = rgbaAlpha(halftoneStyles.comic ?? '', 'background-image')
  const editorialHalftone = rgbaAlpha(halftoneStyles.editorial ?? '', 'background-image')
  const brutalistHalftone = rgbaAlpha(halftoneStyles.brutalist ?? '', 'background-image')
  expect(comicHalftone).toBeGreaterThan(brutalistHalftone)
  expect(comicHalftone).toBeGreaterThan(editorialHalftone)
})
