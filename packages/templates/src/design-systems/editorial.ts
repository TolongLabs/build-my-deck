import type { DesignSystem } from '../schema'

/**
 * The Layak editorial scale — restrained warm palette, generous whitespace,
 * hairline rules. Reference: `layak-pitch-deck.html:580-707`. Signature
 * effect is `editorial-rule` (thin structural lines); halftone and hard
 * shadow are present but deliberately subdued.
 */
export const editorial: DesignSystem = {
  id: 'editorial',
  version: '1',
  fonts: ['Literata', 'JetBrains Mono'],
  typeRoles: {
    eyebrow: {
      fontFamily: 'JetBrains Mono',
      fontWeight: 500,
      fontSize: 24,
      minFontSize: 16,
      lineHeight: 1.3,
      letterSpacing: 3,
      color: '#5C5347'
    },
    headline: {
      fontFamily: 'Literata',
      fontWeight: 700,
      fontSize: 72,
      minFontSize: 40,
      lineHeight: 1.03,
      letterSpacing: -1.5,
      color: '#211D18'
    },
    'headline-lg': {
      fontFamily: 'Literata',
      fontWeight: 700,
      fontSize: 220,
      minFontSize: 96,
      lineHeight: 0.95,
      letterSpacing: -6,
      color: '#C23B4B'
    },
    subtitle: {
      fontFamily: 'Literata',
      fontWeight: 400,
      fontSize: 36,
      minFontSize: 22,
      lineHeight: 1.3,
      letterSpacing: 0,
      color: '#5C5347'
    },
    body: {
      fontFamily: 'Literata',
      fontWeight: 400,
      fontSize: 28,
      minFontSize: 18,
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#5C5347'
    },
    caption: {
      fontFamily: 'JetBrains Mono',
      fontWeight: 500,
      fontSize: 20,
      minFontSize: 14,
      lineHeight: 1.4,
      letterSpacing: 1,
      color: '#5C5347'
    },
    'stat-value': {
      fontFamily: 'Literata',
      fontWeight: 700,
      fontSize: 96,
      minFontSize: 48,
      lineHeight: 1,
      letterSpacing: -2,
      color: '#C23B4B'
    },
    'stat-label': {
      fontFamily: 'JetBrains Mono',
      fontWeight: 500,
      fontSize: 22,
      minFontSize: 14,
      lineHeight: 1.3,
      letterSpacing: 1.5,
      color: '#5C5347'
    },
    quote: {
      fontFamily: 'Literata',
      fontWeight: 400,
      fontSize: 40,
      minFontSize: 24,
      lineHeight: 1.3,
      letterSpacing: 0,
      color: '#211D18'
    },
    'quote-attribution': {
      fontFamily: 'JetBrains Mono',
      fontWeight: 500,
      fontSize: 22,
      minFontSize: 14,
      lineHeight: 1.4,
      letterSpacing: 1,
      color: '#5C5347'
    },
    'agenda-item': {
      fontFamily: 'Literata',
      fontWeight: 400,
      fontSize: 32,
      minFontSize: 20,
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#211D18'
    },
    'agenda-number': {
      fontFamily: 'JetBrains Mono',
      fontWeight: 500,
      fontSize: 28,
      minFontSize: 16,
      lineHeight: 1.2,
      letterSpacing: 0,
      color: '#C23B4B'
    },
    'badge-label': {
      fontFamily: 'JetBrains Mono',
      fontWeight: 500,
      fontSize: 20,
      minFontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 1,
      color: '#FAF5EE'
    }
  },
  colorRoles: {
    ink: '#211D18',
    'ink-muted': '#5C5347',
    paper: '#FAF5EE',
    accent: '#C23B4B',
    'accent-contrast': '#FFFFFF',
    'panel-bg': '#F1E9DC',
    'panel-border': '#D8CBB5',
    'badge-bg': '#C23B4B',
    'badge-text': '#FAF5EE',
    'stat-accent': '#7A8B5E',
    rule: '#D8CBB5',
    decor: '#EDE2D0'
  },
  componentStyles: {
    panel: { backgroundRef: 'panel-bg', borderRef: 'panel-border', textRef: 'body' },
    badge: { backgroundRef: 'badge-bg', borderRef: 'panel-border', textRef: 'badge-label' },
    stat: { backgroundRef: 'panel-bg', borderRef: 'stat-accent', textRef: 'stat-label' }
  },
  effects: {
    halftone: { colorRef: 'decor', intensity: 0.08 },
    'hard-shadow': { colorRef: 'ink', intensity: 0.15 },
    'editorial-rule': { colorRef: 'rule', intensity: 1 }
  }
}
