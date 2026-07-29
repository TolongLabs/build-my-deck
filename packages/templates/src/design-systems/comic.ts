import type { DesignSystem } from '../schema'

/**
 * The SahurHub comic/halftone direction — display lettering, halftone dot
 * overlays and a hard offset "sticker" shadow. Reference:
 * `pitch-deck.html` (`--font-display`, `.halftone`, `-webkit-text-stroke`).
 * Signature effects are `halftone` and `hard-shadow`, both near-maximum
 * intensity; `editorial-rule` is present only as a minor accent.
 */
export const comic: DesignSystem = {
  id: 'comic',
  version: '1',
  fonts: ['Bangers', 'Archivo Black', 'Archivo'],
  typeRoles: {
    eyebrow: {
      fontFamily: 'Archivo',
      fontWeight: 700,
      fontSize: 26,
      minFontSize: 18,
      lineHeight: 1.2,
      letterSpacing: 2,
      color: '#FF4B6E'
    },
    headline: {
      fontFamily: 'Bangers',
      fontWeight: 400,
      fontSize: 96,
      minFontSize: 48,
      lineHeight: 0.95,
      letterSpacing: 1,
      color: '#14110F'
    },
    'headline-lg': {
      fontFamily: 'Bangers',
      fontWeight: 400,
      fontSize: 260,
      minFontSize: 120,
      lineHeight: 0.9,
      letterSpacing: 2,
      color: '#FF4B6E'
    },
    subtitle: {
      fontFamily: 'Archivo',
      fontWeight: 700,
      fontSize: 34,
      minFontSize: 20,
      lineHeight: 1.25,
      letterSpacing: 0,
      color: '#14110F'
    },
    body: {
      fontFamily: 'Archivo',
      fontWeight: 400,
      fontSize: 30,
      minFontSize: 18,
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#4A4038'
    },
    caption: {
      fontFamily: 'Archivo',
      fontWeight: 700,
      fontSize: 20,
      minFontSize: 14,
      lineHeight: 1.3,
      letterSpacing: 1,
      color: '#4A4038'
    },
    'stat-value': {
      fontFamily: 'Archivo Black',
      fontWeight: 400,
      fontSize: 110,
      minFontSize: 56,
      lineHeight: 0.95,
      letterSpacing: -1,
      color: '#008A85'
    },
    'stat-label': {
      fontFamily: 'Archivo',
      fontWeight: 700,
      fontSize: 24,
      minFontSize: 16,
      lineHeight: 1.3,
      letterSpacing: 1,
      color: '#14110F'
    },
    quote: {
      fontFamily: 'Archivo',
      fontWeight: 700,
      fontSize: 42,
      minFontSize: 24,
      lineHeight: 1.25,
      letterSpacing: 0,
      color: '#14110F'
    },
    'quote-attribution': {
      fontFamily: 'Archivo',
      fontWeight: 400,
      fontSize: 22,
      minFontSize: 14,
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#4A4038'
    },
    'agenda-item': {
      fontFamily: 'Archivo',
      fontWeight: 700,
      fontSize: 34,
      minFontSize: 20,
      lineHeight: 1.3,
      letterSpacing: 0,
      color: '#14110F'
    },
    'agenda-number': {
      fontFamily: 'Archivo Black',
      fontWeight: 400,
      fontSize: 40,
      minFontSize: 22,
      lineHeight: 1,
      letterSpacing: 0,
      color: '#FF4B6E'
    },
    'badge-label': {
      fontFamily: 'Archivo Black',
      fontWeight: 400,
      fontSize: 22,
      minFontSize: 16,
      lineHeight: 1.1,
      letterSpacing: 0.5,
      color: '#FFF6E0'
    }
  },
  colorRoles: {
    ink: '#14110F',
    'ink-muted': '#4A4038',
    paper: '#FFF6E0',
    accent: '#FF4B6E',
    'accent-contrast': '#14110F',
    'panel-bg': '#FFE7A8',
    'panel-border': '#14110F',
    'badge-bg': '#FF4B6E',
    'badge-text': '#FFF6E0',
    'stat-accent': '#008A85',
    rule: '#14110F',
    decor: '#FFD23F'
  },
  componentStyles: {
    panel: { backgroundRef: 'panel-bg', borderRef: 'panel-border', textRef: 'body' },
    badge: { backgroundRef: 'badge-bg', borderRef: 'panel-border', textRef: 'badge-label' },
    stat: { backgroundRef: 'panel-bg', borderRef: 'stat-accent', textRef: 'stat-label' }
  },
  effects: {
    halftone: { colorRef: 'decor', intensity: 0.9 },
    'hard-shadow': { colorRef: 'ink', intensity: 0.85 },
    'editorial-rule': { colorRef: 'rule', intensity: 0.2 }
  }
}
