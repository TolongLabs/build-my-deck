export { DeckView, renderDeckToHtml, SlideView } from './render'
export {
  effectToCssProperties,
  resolveColorStyle,
  resolveComponentStyle,
  resolveEffectStyle,
  resolveTypeStyle,
  themeToCss
} from './theme-to-css'
export type { ResolvedComponentStyle, ResolvedEffectStyle } from './theme-to-css'

export const installDeckStage = () => import('./deck-stage')
