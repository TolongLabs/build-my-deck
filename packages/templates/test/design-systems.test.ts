import { describe, expect, test } from 'bun:test'
import { CATALOG, styleRefsUsedBy } from '../src/catalog'
import { DESIGN_SYSTEMS, DESIGN_SYSTEM_IDS, comic, editorial } from '../src/design-systems/index'
import { FONT_ASSETS } from '../src/fonts'
import { toThemeSpec, unresolvedStyleRefs } from '../src/theme'

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const [red, green, blue] = (hex.match(/[0-9a-f]{2}/gi) ?? []).map((channel) => Number.parseInt(channel, 16) / 255)
    const linear = [red, green, blue].map((channel) =>
      channel === undefined ? 0 : channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )
    return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
  }
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

describe('design systems', () => {
  test('slice 1 ships exactly 3 curated systems', () => {
    expect(DESIGN_SYSTEM_IDS.sort()).toEqual(['brutalist', 'comic', 'editorial'])
  })

  test('every typeRef/colorRef used by any template resolves in all three systems', () => {
    for (const template of CATALOG) {
      const usage = styleRefsUsedBy(template)
      for (const [systemId, system] of Object.entries(DESIGN_SYSTEMS)) {
        const unresolved = unresolvedStyleRefs(usage, system)
        expect(unresolved.typeRefs, `${template.id} in ${systemId}`).toEqual([])
        expect(unresolved.colorRefs, `${template.id} in ${systemId}`).toEqual([])
      }
    }
  })

  test('every font family a system declares is self-hosted under fonts/', () => {
    for (const [systemId, system] of Object.entries(DESIGN_SYSTEMS)) {
      for (const family of system.fonts) {
        expect(
          FONT_ASSETS.some((f) => f.family === family),
          `${systemId} declares unhosted font "${family}"`
        ).toBe(true)
      }
    }
  })

  test('every typeRole references a (family, weight) pair that is actually self-hosted', () => {
    for (const [systemId, system] of Object.entries(DESIGN_SYSTEMS)) {
      for (const [roleName, role] of Object.entries(system.typeRoles)) {
        const hosted = FONT_ASSETS.some((f) => f.family === role.fontFamily && f.weight === role.fontWeight)
        expect(hosted, `${systemId}.${roleName} uses ${role.fontFamily}/${role.fontWeight}, not self-hosted`).toBe(true)
      }
    }
  })

  test('every componentStyle role resolves into colorRoles (background/border) and typeRoles (text)', () => {
    for (const [systemId, system] of Object.entries(DESIGN_SYSTEMS)) {
      for (const [name, style] of Object.entries(system.componentStyles)) {
        expect(style.backgroundRef in system.colorRoles, `${systemId}.${name}.backgroundRef`).toBe(true)
        expect(style.borderRef in system.colorRoles, `${systemId}.${name}.borderRef`).toBe(true)
        expect(style.textRef in system.typeRoles, `${systemId}.${name}.textRef`).toBe(true)
      }
    }
  })

  test('every effect declares a colorRef that resolves in its own system', () => {
    for (const [systemId, system] of Object.entries(DESIGN_SYSTEMS)) {
      for (const [name, effect] of Object.entries(system.effects)) {
        expect(effect.colorRef in system.colorRoles, `${systemId}.effects.${name}`).toBe(true)
      }
    }
  })

  test('each system has a genuinely different signature effect, not just a recoloured one', () => {
    // Comic is halftone/hard-shadow dominant; editorial and brutalist both lean on
    // editorial-rule but at different weights and with an entirely different type/colour
    // system, so the three are not interchangeable modulo accent hue.
    expect(DESIGN_SYSTEMS.comic?.effects.halftone.intensity).toBeGreaterThan(0.7)
    expect(DESIGN_SYSTEMS.comic?.effects['hard-shadow'].intensity).toBeGreaterThan(0.7)
    expect(DESIGN_SYSTEMS.editorial?.effects['editorial-rule'].intensity).toBeGreaterThanOrEqual(0.9)
    expect(DESIGN_SYSTEMS.brutalist?.effects['editorial-rule'].intensity).toBeGreaterThanOrEqual(0.9)
    expect(DESIGN_SYSTEMS.editorial?.effects.halftone.intensity).toBeLessThan(
      DESIGN_SYSTEMS.comic?.effects.halftone.intensity ?? 0
    )
  })

  test('toThemeSpec projects each system’s effects and component styles without aliasing the catalog', () => {
    const comicTheme = toThemeSpec(comic)
    const editorialTheme = toThemeSpec(editorial)

    expect(comicTheme.effects?.halftone.intensity).toBe(comic.effects.halftone.intensity)
    expect(comicTheme.effects?.['hard-shadow'].intensity).toBe(comic.effects['hard-shadow'].intensity)
    expect(editorialTheme.effects?.halftone.intensity).toBe(editorial.effects.halftone.intensity)
    expect(editorialTheme.effects?.['hard-shadow'].intensity).toBe(editorial.effects['hard-shadow'].intensity)

    for (const system of Object.values(DESIGN_SYSTEMS)) {
      const theme = toThemeSpec(system)

      expect(theme.effects).toEqual(system.effects)
      expect(theme.componentStyles).toEqual(system.componentStyles)
      expect(theme.effects).not.toBe(system.effects)
      expect(theme.componentStyles).not.toBe(system.componentStyles)

      for (const effectName of Object.keys(system.effects) as Array<keyof typeof system.effects>) {
        expect(theme.effects?.[effectName]).not.toBe(system.effects[effectName])
      }
      for (const styleName of Object.keys(system.componentStyles) as Array<keyof typeof system.componentStyles>) {
        expect(theme.componentStyles?.[styleName]).not.toBe(system.componentStyles[styleName])
      }
    }
  })

  test('per-role minimum font sizes are never larger than the role’s own default size', () => {
    for (const [systemId, system] of Object.entries(DESIGN_SYSTEMS)) {
      for (const [roleName, role] of Object.entries(system.typeRoles)) {
        expect(role.minFontSize, `${systemId}.${roleName}`).toBeLessThanOrEqual(role.fontSize)
      }
    }
  })

  test('large accent display roles meet the 3:1 contrast floor on their system paper', () => {
    for (const [systemId, role] of [
      ['comic', 'stat-value'],
      ['brutalist', 'eyebrow'],
      ['brutalist', 'agenda-number']
    ] as const) {
      const system = DESIGN_SYSTEMS[systemId]
      const color = system?.typeRoles[role]?.color
      const paper = system?.colorRoles.paper
      if (!color || !paper) throw new Error(`${systemId}.${role} is missing a color or paper role`)
      expect(contrastRatio(color, paper), `${systemId}.${role}`).toBeGreaterThanOrEqual(3)
    }
  })
})
