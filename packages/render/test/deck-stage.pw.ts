import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Page, expect, test } from '@playwright/test'
import * as typescript from 'typescript'

type Deferred = {
  promise: Promise<void>
  resolve: () => void
}

type DeckStageTestState = {
  animationFrames: FrameRequestCallback[]
  fontGate: Deferred
  imageGate: Deferred
  svgImageGate: Deferred
  ready: boolean
}

declare global {
  interface Window {
    __deckStageTest: DeckStageTestState
  }
}

const deckStagePath = fileURLToPath(new URL('../src/deck-stage.ts', import.meta.url))
const deckStageCssPath = fileURLToPath(new URL('../src/deck-stage.css.ts', import.meta.url))
const deckStageSource = readFileSync(deckStagePath, 'utf8').replace(
  "import { deckStageCss } from './deck-stage.css'\n",
  ''
)
const deckStageScript = typescript.transpileModule(`${readFileSync(deckStageCssPath, 'utf8')}\n${deckStageSource}`, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022
  }
}).outputText

const slides = (count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      `<section data-label="Slide ${index + 1}"><h1>Slide ${index + 1}</h1><div data-element-id="element-${index + 1}"></div></section>`
  ).join('')

const svgImageMarkup =
  '<svg><image href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E"></image></svg>'

async function installDeckStage(page: Page) {
  await page.addScriptTag({ content: deckStageScript, type: 'module' })
}

async function waitForDeckStageReady(page: Page) {
  await page.waitForFunction(() => document.querySelector('deck-stage')?.hasAttribute('data-deck-ready'))
}

function readCanvasScale(page: Page) {
  return page.locator('deck-stage').evaluate((stage) => {
    const canvas = stage.shadowRoot?.querySelector<HTMLElement>('.canvas')
    if (!canvas) throw new Error('deck-stage shadow root is missing .canvas')
    const match = canvas.style.transform.match(/scale\(([^)]+)\)/)
    const value = match?.[1]
    if (!value) throw new Error(`canvas transform did not contain scale(): "${canvas.style.transform}"`)
    return Number.parseFloat(value)
  })
}

// #fit() runs from a window 'resize' listener (deck-stage.ts #onResize), and
// page.setViewportSize() resolves as soon as the browser has applied the new
// size -- not once the page's own resize handler has finished running. A
// single post-resize read of canvas.style.transform therefore sometimes
// samples the previous viewport's scale (QA re-review, R-4: ~17% reproduced
// outside Playwright on an idle machine). Poll for the settled value instead
// of sampling once; the matcher stays exact (toBeCloseTo(expected, 3)), only
// *when* it samples changes.
async function expectCanvasScale(page: Page, expected: number) {
  await expect.poll(() => readCanvasScale(page)).toBeCloseTo(expected, 3)
}

test('scales slotted slides across viewports and preserves navigation state', async ({ page }) => {
  await page.goto('/')
  await page.setContent(`<deck-stage>${slides(3)}</deck-stage>`)
  await installDeckStage(page)
  await waitForDeckStageReady(page)

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 1080 },
    { width: 1920, height: 720 }
  ]) {
    await page.setViewportSize(viewport)
    await expectCanvasScale(page, Math.min(viewport.width / 1920, viewport.height / 1080))
  }

  const elementCounts = await page.evaluate(() => {
    const stage = document.querySelector('deck-stage')
    if (!stage?.shadowRoot) throw new Error('deck-stage or its shadow root is missing')
    return {
      light: document.querySelectorAll('[data-element-id]').length,
      shadow: stage.shadowRoot.querySelectorAll('[data-element-id]').length
    }
  })
  expect(elementCounts.light).toBe(3)
  expect(elementCounts.shadow).toBe(0)

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('section[data-deck-active]')).toHaveCount(1)
  await expect(page.locator('section[data-deck-active]')).toHaveAttribute('data-deck-slide', '1')
  expect(await page.evaluate(() => localStorage.getItem(`deck-stage:slide:${location.pathname}`))).toBe('1')
})

test('prints each slotted slide as a 16:9 page', async ({ page }) => {
  await page.goto('/')
  await page.setContent(`<deck-stage>${slides(3)}</deck-stage>`)
  await installDeckStage(page)
  await waitForDeckStageReady(page)

  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  const pdfText = pdf.toString('latin1')

  expect(pdfText.match(/\/Type\s*\/Page\b/g)).toHaveLength(3)
  expect(pdfText).toMatch(/\/MediaBox\s*\[\s*0\s+0\s+1440\s+810\s*\]/)
})

test('fires deck-stage:ready when the SVG image already finished loading before the component upgraded', async ({
  page
}) => {
  await page.goto('/')
  await page.setContent(`<deck-stage><section>${svgImageMarkup}</section></deck-stage>`)
  // Genuinely wait for the browser to finish loading the image, using its own
  // real completion signal -- not a synthetic event -- so the deck-stage
  // element upgrades (below) strictly after the image's real 'load' event has
  // already fired and can never fire again.
  await page.evaluate(async () => {
    const image = document.querySelector('svg image') as unknown as { decode: () => Promise<void> } | null
    await image?.decode()
  })
  await installDeckStage(page)
  await waitForDeckStageReady(page)
})

test('fires deck-stage:ready after fonts, image decode, SVG decode, and two frames', async ({ page }) => {
  await page.goto('/')
  await page.setContent(
    `<deck-stage><section><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">${svgImageMarkup}</section></deck-stage>`
  )
  await page.evaluate(() => {
    const deferred = (): Deferred => {
      let resolve: (() => void) | undefined
      const promise = new Promise<void>((resolvePromise) => {
        resolve = resolvePromise
      })
      return { promise, resolve: () => resolve?.() }
    }
    const fontGate = deferred()
    const imageGate = deferred()
    const svgImageGate = deferred()
    const animationFrames: FrameRequestCallback[] = []
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: fontGate.promise }
    })
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: () => imageGate.promise
    })
    Object.defineProperty(SVGImageElement.prototype, 'decode', {
      configurable: true,
      value: () => svgImageGate.promise
    })
    window.requestAnimationFrame = (callback) => {
      animationFrames.push(callback)
      return animationFrames.length
    }
    window.__deckStageTest = { animationFrames, fontGate, imageGate, svgImageGate, ready: false }
    document.addEventListener('deck-stage:ready', () => {
      window.__deckStageTest.ready = true
    })
  })
  await installDeckStage(page)

  await expect.poll(() => page.evaluate(() => window.__deckStageTest.ready)).toBe(false)
  await page.evaluate(() => window.__deckStageTest.fontGate.resolve())
  await expect.poll(() => page.evaluate(() => window.__deckStageTest.ready)).toBe(false)
  await page.evaluate(() => window.__deckStageTest.imageGate.resolve())
  await expect.poll(() => page.evaluate(() => window.__deckStageTest.ready)).toBe(false)
  await page.evaluate(() => window.__deckStageTest.svgImageGate.resolve())
  await page.waitForFunction(() => window.__deckStageTest.animationFrames.length === 1)

  await page.evaluate(() => window.__deckStageTest.animationFrames.shift()?.(performance.now()))
  await expect.poll(() => page.evaluate(() => window.__deckStageTest.ready)).toBe(false)
  await page.waitForFunction(() => window.__deckStageTest.animationFrames.length === 1)
  await page.evaluate(() => window.__deckStageTest.animationFrames.shift()?.(performance.now()))

  await expect.poll(() => page.evaluate(() => window.__deckStageTest.ready)).toBe(true)
})
