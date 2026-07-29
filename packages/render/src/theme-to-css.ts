import type {
  ColorStyle,
  ComponentStyleName,
  EffectName,
  EffectStyle,
  TextStyle,
  ThemeSpec,
  TypeStyle
} from '@build-my-deck/deck-schema'
import type { CSSProperties } from 'react'

export type ResolvedColorStyle = {
  color: string
  opacity: number
}

export type ResolvedEffectStyle = {
  color: string
  intensity: number
}

export type ResolvedComponentStyle = {
  background: string
  border: string
  text: TypeStyle
}

const cssDeclaration = (name: string, value: string | number) => `${name}:${value}`

export function resolveTypeStyle(theme: ThemeSpec, style: TextStyle): TypeStyle {
  const referenced = theme.typeStyles[style.typeRef]
  if (!referenced) throw new Error(`Unknown typography role: ${style.typeRef}`)
  return { ...referenced, ...style.overrides }
}

export function resolveColorStyle(theme: ThemeSpec, style: ColorStyle): ResolvedColorStyle {
  const color = style.overrides?.color ?? theme.colorRoles[style.colorRef]
  if (!color) throw new Error(`Unknown color role: ${style.colorRef}`)
  return { color, opacity: style.overrides?.opacity ?? 1 }
}

export function resolveEffectStyle(theme: ThemeSpec, style: EffectStyle): ResolvedEffectStyle {
  const spec = theme.effects?.[style.effectRef]
  if (!spec) throw new Error(`Unknown effect role: ${style.effectRef}`)
  const color = theme.colorRoles[spec.colorRef]
  if (!color) throw new Error(`Unknown color role: ${spec.colorRef}`)
  return { color, intensity: style.overrides?.intensity ?? spec.intensity }
}

export function resolveComponentStyle(theme: ThemeSpec, componentRef: ComponentStyleName): ResolvedComponentStyle {
  const spec = theme.componentStyles?.[componentRef]
  if (!spec) throw new Error(`Unknown component style role: ${componentRef}`)
  const background = theme.colorRoles[spec.backgroundRef]
  if (!background) throw new Error(`Unknown color role: ${spec.backgroundRef}`)
  const border = theme.colorRoles[spec.borderRef]
  if (!border) throw new Error(`Unknown color role: ${spec.borderRef}`)
  const text = theme.typeStyles[spec.textRef]
  if (!text) throw new Error(`Unknown typography role: ${spec.textRef}`)
  return { background, border, text }
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Translates a resolved, named effect into concrete CSS declarations. Every
 * declaration carries the effect's resolved color and intensity, so the same
 * element renders materially different CSS under a design system where the
 * effect dominates (comic's halftone/hard-shadow) versus one where it is
 * deliberately subdued (editorial/brutalist) — the intensity is not merely a
 * theme-level variable, it reaches the element's own inline style.
 */
export function effectToCssProperties(effectRef: EffectName, resolved: ResolvedEffectStyle): CSSProperties {
  const { color, intensity } = resolved
  if (effectRef === 'halftone') {
    const dot = 1 + intensity * 2
    return {
      backgroundImage: `radial-gradient(${rgba(color, intensity)} ${dot}px, transparent ${dot}px)`,
      backgroundSize: `${8 - intensity * 3}px ${8 - intensity * 3}px`
    }
  }
  if (effectRef === 'hard-shadow') {
    const offset = Math.round(2 + intensity * 14)
    return { boxShadow: `${offset}px ${offset}px 0 0 ${rgba(color, intensity)}` }
  }
  const thickness = Math.max(1, Math.round(intensity * 6))
  return { borderBottom: `${thickness}px solid ${rgba(color, intensity)}` }
}

export function themeToCss(theme: ThemeSpec): string {
  const colors = Object.entries(theme.colorRoles).map(([role, color]) => cssDeclaration(`--bmd-color-${role}`, color))
  const types = Object.entries(theme.typeStyles).flatMap(([role, style]) => [
    cssDeclaration(`--bmd-type-${role}-family`, style.fontFamily),
    cssDeclaration(`--bmd-type-${role}-size`, `${style.fontSize}px`),
    cssDeclaration(`--bmd-type-${role}-line-height`, style.lineHeight),
    cssDeclaration(`--bmd-type-${role}-letter-spacing`, `${style.letterSpacing}px`),
    cssDeclaration(`--bmd-type-${role}-weight`, style.fontWeight),
    ...(style.color ? [cssDeclaration(`--bmd-type-${role}-color`, style.color)] : [])
  ])
  const components = Object.entries(theme.componentStyles ?? {}).flatMap(([role, style]) => {
    const background = theme.colorRoles[style.backgroundRef]
    const border = theme.colorRoles[style.borderRef]
    return [
      ...(background ? [cssDeclaration(`--bmd-component-${role}-background`, background)] : []),
      ...(border ? [cssDeclaration(`--bmd-component-${role}-border`, border)] : [])
    ]
  })
  const effects = Object.entries(theme.effects ?? {}).flatMap(([name, spec]) => {
    const color = theme.colorRoles[spec.colorRef]
    return [
      ...(color ? [cssDeclaration(`--bmd-effect-${name}-color`, color)] : []),
      cssDeclaration(`--bmd-effect-${name}-intensity`, spec.intensity)
    ]
  })

  return `:root{${[...colors, ...types, ...components, ...effects].join(';')}}`
}
