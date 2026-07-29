import { Frame, TextParagraph } from '@build-my-deck/deck-schema'
import { z } from 'zod'

/**
 * Local identifier grammar, kept in lockstep with `packages/deck-schema`'s
 * opaque reference grammar (an ASCII letter/digit, then up to 127 further
 * ASCII letters/digits/dots/underscores/hyphens, no `..`). Catalog ids,
 * slot names and style-ref role names all flow into schema-level
 * `identifier`-typed fields once `instantiate()` runs, so they must satisfy
 * the same grammar or a schema-valid fixture could not exist.
 */
export const identifier = z.string().regex(/^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/)

export const SlotAccepts = z.enum(['text', 'stat', 'quote', 'screenshot', 'image', 'diagram'])
export type SlotAccepts = z.infer<typeof SlotAccepts>

export const SlotBudget = z.strictObject({
  maxChars: z.number().int().positive().optional(),
  maxLines: z.number().int().positive().optional(),
  maxItems: z.number().int().positive().optional()
})
export type SlotBudget = z.infer<typeof SlotBudget>

export const ComponentStyleName = z.enum(['panel', 'badge', 'stat'])
export type ComponentStyleName = z.infer<typeof ComponentStyleName>

/** Bounded effects vocabulary shared with the document model. */
export const EffectName = z.enum(['halftone', 'hard-shadow', 'editorial-rule'])
export type EffectName = z.infer<typeof EffectName>

export const StyleRef = z.strictObject({
  typeRef: identifier.optional(),
  colorRef: identifier.optional(),
  componentRef: ComponentStyleName.optional(),
  /** Used only by `quote`-accepting slots to style the attribution line separately. */
  secondaryTypeRef: identifier.optional()
})
export type StyleRef = z.infer<typeof StyleRef>

export const TemplateSlot = z.strictObject({
  accepts: z.array(SlotAccepts).min(1),
  budget: SlotBudget,
  optional: z.boolean(),
  priority: z.number().int(),
  frame: Frame,
  style: StyleRef
})
export type TemplateSlot = z.infer<typeof TemplateSlot>

/** A fixed, non-content-bound, purely decorative element every instantiation emits. */
export const FixedElement = z.strictObject({
  id: identifier,
  kind: z.enum(['shape', 'icon']),
  shape: z.enum(['rectangle', 'ellipse', 'line']).optional(),
  catalogRef: identifier.optional(),
  frame: Frame,
  style: StyleRef,
  /** `behind` stacks under every slot element; `front` stacks above all of them. */
  zOrder: z.enum(['behind', 'front']),
  /** Cites one renderer-resolved effect treatment. */
  effectRef: EffectName.optional()
})
export type FixedElement = z.infer<typeof FixedElement>

export const CollisionGroup = z.strictObject({
  id: identifier,
  memberIds: z.array(identifier).min(2),
  /** Finding 3: text-over-text is critical, decorative collision is informational. */
  severity: z.enum(['informational', 'critical'])
})
export type CollisionGroup = z.infer<typeof CollisionGroup>

export const RepeaterItemSlot = z.strictObject({
  name: identifier,
  accepts: z.array(SlotAccepts).min(1),
  budget: SlotBudget,
  priority: z.number().int(),
  /** Frame relative to the repeater cell's top-left corner. */
  frame: Frame,
  style: StyleRef
})
export type RepeaterItemSlot = z.infer<typeof RepeaterItemSlot>

export const RepeaterSpec = z.strictObject({
  id: identifier,
  /** `row` repeats cells left-to-right (e.g. a stat row); `column` repeats top-to-bottom (e.g. a list). */
  direction: z.enum(['row', 'column']),
  min: z.number().int().positive(),
  max: z.number().int().positive(),
  cellWidth: z.number().positive(),
  cellHeight: z.number().positive(),
  gap: z.number().nonnegative(),
  startX: z.number(),
  y: z.number(),
  itemSlots: z.array(RepeaterItemSlot).min(1)
})
export type RepeaterSpec = z.infer<typeof RepeaterSpec>

export const SafeAreas = z.strictObject({
  margin: z.number().nonnegative()
})
export type SafeAreas = z.infer<typeof SafeAreas>

export const Template = z.strictObject({
  id: identifier,
  version: identifier,
  intents: z.array(z.string().min(1)).min(1),
  slots: z.record(identifier, TemplateSlot),
  fixedElements: z.array(FixedElement),
  safeAreas: SafeAreas,
  collisionGroups: z.array(CollisionGroup),
  repeater: RepeaterSpec.optional(),
  compatibleVariants: z.array(identifier),
  /**
   * Whether the catalog manifest (`manifest.ts`) offers this entry to the
   * model directly. Dense variants are `false`: per D8, `bindSlide` selects a
   * higher-capacity variant deterministically via `compatibleVariants` when
   * standard content overflows — the model never picks a variant itself.
   */
  manifestVisible: z.boolean().default(true)
})
export type Template = z.infer<typeof Template>

// --- Design systems -------------------------------------------------------

export const TypeRole = z.strictObject({
  fontFamily: z.string().min(1),
  fontWeight: z.number().int().positive(),
  fontSize: z.number().positive(),
  minFontSize: z.number().positive(),
  lineHeight: z.number().positive(),
  letterSpacing: z.number(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
})
export type TypeRole = z.infer<typeof TypeRole>

export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const ComponentStyle = z.strictObject({
  backgroundRef: identifier,
  borderRef: identifier,
  textRef: identifier
})
export type ComponentStyle = z.infer<typeof ComponentStyle>

export const EffectSpec = z.strictObject({
  colorRef: identifier,
  intensity: z.number().min(0).max(1)
})
export type EffectSpec = z.infer<typeof EffectSpec>

export const DesignSystem = z.strictObject({
  id: identifier,
  version: identifier,
  fonts: z.array(z.string().min(1)).min(1),
  typeRoles: z.record(identifier, TypeRole),
  colorRoles: z.record(identifier, HexColor),
  componentStyles: z.record(ComponentStyleName, ComponentStyle),
  effects: z.record(EffectName, EffectSpec)
})
export type DesignSystem = z.infer<typeof DesignSystem>

// --- Bindings (instantiate() input) ---------------------------------------

export const TextBinding = z.strictObject({
  kind: z.literal('text'),
  paragraphs: z.array(TextParagraph).min(1)
})

export const StatBinding = z.strictObject({
  kind: z.literal('stat'),
  value: z.string().min(1),
  label: z.string().min(1)
})

export const QuoteBinding = z.strictObject({
  kind: z.literal('quote'),
  quote: z.string().min(1),
  attribution: z.string().min(1).optional()
})

export const ImageBinding = z.strictObject({
  kind: z.enum(['image', 'screenshot']),
  assetId: z.string().min(1),
  alt: z.string().min(1)
})

export const SlotBinding = z.discriminatedUnion('kind', [TextBinding, StatBinding, QuoteBinding, ImageBinding])
export type SlotBinding = z.infer<typeof SlotBinding>

export const SlotBindings = z.record(identifier, SlotBinding)
export type SlotBindings = z.infer<typeof SlotBindings>

export const RepeaterBindings = z.array(z.record(identifier, SlotBinding))
export type RepeaterBindings = z.infer<typeof RepeaterBindings>

export const TemplateBindings = z.strictObject({
  slots: SlotBindings,
  repeaterItems: RepeaterBindings.optional()
})
export type TemplateBindings = z.infer<typeof TemplateBindings>
