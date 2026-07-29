import type { DesignSystem } from '../schema'

/**
 * Industrial brutalist / tactical terminal — a contrasting third direction:
 * condensed Swiss-poster display type, monospace technical labels, a stark
 * near-monochrome palette with one signal accent. Signature effect is
 * `editorial-rule` used as a dense structural grid, not a hairline; halftone
 * is a minor texture and hard-shadow is flat/blocky rather than soft.
 */
export const brutalist: DesignSystem = {
  id: 'brutalist',
  version: '1',
  fonts: ['Anton', 'IBM Plex Mono', 'IBM Plex Sans'],
  typeRoles: {
    eyebrow: {
      fontFamily: 'IBM Plex Mono',
      fontWeight: 700,
      fontSize: 24,
      minFontSize: 16,
      lineHeight: 1.2,
      letterSpacing: 2,
      color: '#E04412'
    },
    headline: {
      fontFamily: 'Anton',
      fontWeight: 400,
      fontSize: 88,
      minFontSize: 44,
      lineHeight: 0.92,
      letterSpacing: 0,
      color: '#0B0C0C'
    },
    'headline-lg': {
      fontFamily: 'Anton',
      fontWeight: 400,
      fontSize: 240,
      minFontSize: 110,
      lineHeight: 0.88,
      letterSpacing: 0,
      color: '#0B0C0C'
    },
    subtitle: {
      fontFamily: 'IBM Plex Sans',
      fontWeight: 700,
      fontSize: 32,
      minFontSize: 20,
      lineHeight: 1.25,
      letterSpacing: 0,
      color: '#55605C'
    },
    body: {
      fontFamily: 'IBM Plex Sans',
      fontWeight: 400,
      fontSize: 28,
      minFontSize: 18,
      lineHeight: 1.45,
      letterSpacing: 0,
      color: '#55605C'
    },
    caption: {
      fontFamily: 'IBM Plex Mono',
      fontWeight: 400,
      fontSize: 20,
      minFontSize: 14,
      lineHeight: 1.3,
      letterSpacing: 1,
      color: '#55605C'
    },
    'stat-value': {
      fontFamily: 'Anton',
      fontWeight: 400,
      fontSize: 100,
      minFontSize: 52,
      lineHeight: 0.9,
      letterSpacing: 0,
      color: '#0B0C0C'
    },
    'stat-label': {
      fontFamily: 'IBM Plex Mono',
      fontWeight: 700,
      fontSize: 22,
      minFontSize: 14,
      lineHeight: 1.3,
      letterSpacing: 1.5,
      color: '#55605C'
    },
    quote: {
      fontFamily: 'IBM Plex Sans',
      fontWeight: 700,
      fontSize: 38,
      minFontSize: 24,
      lineHeight: 1.3,
      letterSpacing: 0,
      color: '#0B0C0C'
    },
    'quote-attribution': {
      fontFamily: 'IBM Plex Mono',
      fontWeight: 400,
      fontSize: 22,
      minFontSize: 14,
      lineHeight: 1.4,
      letterSpacing: 1,
      color: '#55605C'
    },
    'agenda-item': {
      fontFamily: 'IBM Plex Sans',
      fontWeight: 700,
      fontSize: 32,
      minFontSize: 20,
      lineHeight: 1.3,
      letterSpacing: 0,
      color: '#0B0C0C'
    },
    'agenda-number': {
      fontFamily: 'IBM Plex Mono',
      fontWeight: 700,
      fontSize: 28,
      minFontSize: 16,
      lineHeight: 1.2,
      letterSpacing: 0,
      color: '#E04412'
    },
    'badge-label': {
      fontFamily: 'IBM Plex Mono',
      fontWeight: 700,
      fontSize: 20,
      minFontSize: 14,
      lineHeight: 1.1,
      letterSpacing: 1.5,
      color: '#0B0C0C'
    }
  },
  colorRoles: {
    ink: '#0B0C0C',
    'ink-muted': '#55605C',
    paper: '#F4F4F2',
    accent: '#E04412',
    'accent-contrast': '#0B0C0C',
    'panel-bg': '#E7E7E3',
    'panel-border': '#0B0C0C',
    'badge-bg': '#E04412',
    'badge-text': '#0B0C0C',
    'stat-accent': '#3DFF7A',
    rule: '#0B0C0C',
    decor: '#DADAD6'
  },
  componentStyles: {
    panel: { backgroundRef: 'panel-bg', borderRef: 'panel-border', textRef: 'body' },
    badge: { backgroundRef: 'badge-bg', borderRef: 'panel-border', textRef: 'badge-label' },
    stat: { backgroundRef: 'panel-bg', borderRef: 'stat-accent', textRef: 'stat-label' }
  },
  effects: {
    halftone: { colorRef: 'decor', intensity: 0.15 },
    'hard-shadow': { colorRef: 'ink', intensity: 0.4 },
    'editorial-rule': { colorRef: 'rule', intensity: 0.95 }
  }
}
