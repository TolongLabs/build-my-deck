import type { ThemeSpec } from '@build-my-deck/deck-schema'
import type { StyleRefUsage } from './catalog'
import type { DesignSystem } from './schema'

/**
 * Projects the richer, templates-owned `DesignSystem` (fonts, per-role
 * minimum sizes, component styles, effects) down to the schema-embeddable
 * `ThemeSpec` that `Deck.theme` actually carries. `themeToCss` (task 8)
 * resolves `styleRef`, component styles and effects against exactly this
 * projection — swapping which `DesignSystem` produced it is the entire "try
 * another design system" mechanism (Q6, D2).
 */
export function toThemeSpec(system: DesignSystem): ThemeSpec {
  const typeStyles: ThemeSpec['typeStyles'] = {}
  for (const [name, role] of Object.entries(system.typeRoles)) {
    typeStyles[name] = {
      fontFamily: role.fontFamily,
      fontSize: role.fontSize,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      fontWeight: role.fontWeight,
      color: role.color
    }
  }
  return {
    id: system.id,
    version: system.version,
    typeStyles,
    colorRoles: { ...system.colorRoles },
    componentStyles: {
      panel: { ...system.componentStyles.panel },
      badge: { ...system.componentStyles.badge },
      stat: { ...system.componentStyles.stat }
    },
    effects: {
      halftone: { ...system.effects.halftone },
      'hard-shadow': { ...system.effects['hard-shadow'] },
      'editorial-rule': { ...system.effects['editorial-rule'] }
    }
  }
}

export type UnresolvedStyleRefs = { typeRefs: string[]; colorRefs: string[] }

/** Names a template references (via `styleRefsUsedBy`) that a design system does not define. */
export function unresolvedStyleRefs(usage: StyleRefUsage, system: DesignSystem): UnresolvedStyleRefs {
  return {
    typeRefs: usage.typeRefs.filter((ref) => !(ref in system.typeRoles)),
    colorRefs: usage.colorRefs.filter((ref) => !(ref in system.colorRoles))
  }
}
