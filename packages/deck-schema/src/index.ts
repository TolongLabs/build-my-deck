import { z } from 'zod'

export const CURRENT_SCHEMA_VERSION = 2

const nonEmptyString = z.string().min(1)
/**
 * Opaque reference grammar: an ASCII letter or digit followed by up to 127 ASCII
 * letters, digits, dots, underscores, or hyphens; consecutive dots are forbidden.
 */
const identifier = z.string().regex(/^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/)
const finiteNumber = z.number().finite()

export const AssetId = identifier
export const ElementId = identifier
export const SlideId = identifier
export const DocumentId = identifier

export const Canvas = z.strictObject({
  width: z.literal(1920),
  height: z.literal(1080),
  printWidthIn: finiteNumber.positive(),
  printHeightIn: finiteNumber.positive()
})

export const TypeStyle = z.strictObject({
  fontFamily: nonEmptyString,
  fontSize: finiteNumber.positive(),
  lineHeight: finiteNumber.positive(),
  letterSpacing: finiteNumber,
  fontWeight: finiteNumber.positive(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
})

/**
 * Mirrors `packages/templates/src/schema.ts`'s `ComponentStyle` shape — kept
 * in lockstep deliberately rather than imported, since `deck-schema` must not
 * depend on `templates` (the dependency runs the other way). A design
 * system's `panel`/`badge`/`stat` component style is cited by role from an
 * element via `ComponentStyleRef`, never inlined as raw colors.
 */
export const ComponentStyleName = z.enum(['panel', 'badge', 'stat'])
export type ComponentStyleName = z.infer<typeof ComponentStyleName>

export const ComponentStyle = z.strictObject({
  backgroundRef: identifier,
  borderRef: identifier,
  textRef: identifier
})
export type ComponentStyle = z.infer<typeof ComponentStyle>

/**
 * Mirrors `packages/templates/src/schema.ts`'s bounded effects vocabulary
 * (halftone, hard shadow, editorial rule). An element cites an effect by
 * `effectRef`; only `intensity` may be tuned per element, and only inside
 * `overrides` — the effect's `colorRef` always resolves through the theme.
 */
export const EffectName = z.enum(['halftone', 'hard-shadow', 'editorial-rule'])
export type EffectName = z.infer<typeof EffectName>

export const EffectSpec = z.strictObject({
  colorRef: identifier,
  intensity: finiteNumber.min(0).max(1)
})
export type EffectSpec = z.infer<typeof EffectSpec>

export const ThemeSpec = z.strictObject({
  id: identifier,
  version: identifier,
  typeStyles: z.record(identifier, TypeStyle),
  colorRoles: z.record(identifier, z.string().regex(/^#[0-9a-fA-F]{6}$/)),
  componentStyles: z.record(ComponentStyleName, ComponentStyle).optional(),
  effects: z.record(EffectName, EffectSpec).optional()
})

export const Asset = z.strictObject({
  id: AssetId,
  mediaType: nonEmptyString,
  contentHash: nonEmptyString
})

export const DeckFlag = z.enum([
  'run_budget_exceeded',
  'shared_pool_exhausted',
  'validation_failed',
  'deterministic_fallback'
])

export const GenerationState = z.strictObject({
  state: z.enum(['complete', 'partial', 'degraded']),
  flags: z.array(DeckFlag)
})

export const DeckMetadata = z.strictObject({
  title: nonEmptyString.optional(),
  description: z.string().optional(),
  generation: GenerationState
})

/** Geometry is expressed exclusively in design-space pixels, never viewport units. */
export const Frame = z.strictObject({
  x: finiteNumber,
  y: finiteNumber,
  w: finiteNumber.positive(),
  h: finiteNumber.positive(),
  rotation: finiteNumber
})

export const Origin = z.strictObject({
  templateSlot: identifier.optional(),
  pipelineStage: identifier.optional(),
  sourceRefs: z.array(nonEmptyString).optional(),
  userOverrides: z.array(z.string().regex(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/)).default([])
})

const typeOverrides = TypeStyle.partial()

export const TextStyle = z.strictObject({
  typeRef: identifier,
  overrides: typeOverrides.optional()
})

export const ColorStyle = z.strictObject({
  colorRef: identifier,
  overrides: z
    .strictObject({
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
      opacity: finiteNumber.min(0).max(1).optional()
    })
    .optional()
})

/** Cites a theme effect by role; only `intensity` may be tuned, and only inside `overrides`. */
export const EffectStyle = z.strictObject({
  effectRef: EffectName,
  overrides: z
    .strictObject({
      intensity: finiteNumber.min(0).max(1).optional()
    })
    .optional()
})

/** Cites a theme component style (panel/badge/stat) by role — never a raw background/border/text value. */
export const ComponentStyleRef = z.strictObject({
  componentRef: ComponentStyleName
})

const elementBaseFields = {
  id: ElementId,
  parentId: ElementId.optional(),
  semanticRole: nonEmptyString,
  frame: Frame,
  opacity: finiteNumber.min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
  priority: z.number().int(),
  origin: Origin.default({ userOverrides: [] }),
  effect: EffectStyle.optional(),
  component: ComponentStyleRef.optional()
}

export const TextRun = z.strictObject({
  text: z.string(),
  marks: z.array(z.enum(['em', 'strong', 'code']))
})

export const TextParagraph = z.strictObject({
  listStyle: z.enum(['bullet', 'ordered']).optional(),
  runs: z.array(TextRun).min(1)
})

export const DiagramSpec = z.strictObject({
  nodes: z.array(
    z.strictObject({
      id: identifier,
      label: z.string().optional(),
      styleRef: identifier.optional()
    })
  ),
  ports: z.array(
    z.strictObject({
      id: identifier,
      nodeId: identifier,
      name: identifier
    })
  ),
  edges: z.array(
    z.strictObject({
      id: identifier,
      fromPortId: identifier,
      toPortId: identifier,
      label: z.string().optional(),
      styleRef: identifier.optional()
    })
  ),
  labels: z.array(
    z.strictObject({
      id: identifier,
      text: z.string(),
      targetId: identifier.optional(),
      styleRef: identifier.optional()
    })
  ),
  styleRefs: z.array(identifier)
})

export const TextElement = z.strictObject({
  ...elementBaseFields,
  kind: z.literal('text'),
  style: TextStyle,
  content: z.strictObject({ paragraphs: z.array(TextParagraph).min(1) })
})

export const ImageElement = z.strictObject({
  ...elementBaseFields,
  kind: z.literal('image'),
  style: ColorStyle,
  assetId: AssetId
})

export const ShapeElement = z.strictObject({
  ...elementBaseFields,
  kind: z.literal('shape'),
  style: ColorStyle,
  shape: z.enum(['rectangle', 'ellipse', 'line'])
})

export const IconElement = z.strictObject({
  ...elementBaseFields,
  kind: z.literal('icon'),
  style: ColorStyle,
  catalogRef: identifier
})

export const SvgElement = z.strictObject({
  ...elementBaseFields,
  kind: z.literal('svg'),
  style: ColorStyle,
  assetId: AssetId
})

export const DiagramElement = z.strictObject({
  ...elementBaseFields,
  kind: z.literal('diagram'),
  style: ColorStyle,
  diagram: DiagramSpec
})

export const GroupElement = z.strictObject({
  ...elementBaseFields,
  kind: z.literal('group'),
  style: ColorStyle
})

export const Element = z.discriminatedUnion('kind', [
  TextElement,
  ImageElement,
  ShapeElement,
  IconElement,
  SvgElement,
  DiagramElement,
  GroupElement
])

export const TemplateRef = z.strictObject({
  id: identifier,
  version: identifier
})

export const Slide = z
  .strictObject({
    id: SlideId,
    templateRef: TemplateRef.optional(),
    elements: z.record(ElementId, Element),
    rootOrder: z.array(ElementId),
    readingOrder: z.array(ElementId),
    speakerNotes: z.string().optional()
  })
  .superRefine((slide, context) => {
    const orderFields = ['rootOrder', 'readingOrder'] as const

    for (const field of orderFields) {
      const seen = new Set<string>()
      for (const [index, elementId] of slide[field].entries()) {
        if (!Object.hasOwn(slide.elements, elementId)) {
          context.addIssue({
            code: 'custom',
            path: [field, index],
            message: `Unknown element id: ${elementId}`
          })
        }
        if (seen.has(elementId)) {
          context.addIssue({
            code: 'custom',
            path: [field, index],
            message: `Duplicate element id: ${elementId}`
          })
        }
        seen.add(elementId)
      }
    }

    for (const [elementId, element] of Object.entries(slide.elements)) {
      if (element.id !== elementId) {
        context.addIssue({
          code: 'custom',
          path: ['elements', elementId, 'id'],
          message: 'Element map keys must match element ids'
        })
      }
    }
  })

export const Deck = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  documentId: DocumentId,
  revision: z.number().int().nonnegative(),
  canvas: Canvas,
  metadata: DeckMetadata,
  theme: ThemeSpec,
  assets: z.record(AssetId, Asset),
  slides: z.array(Slide)
})

export type AssetId = z.infer<typeof AssetId>
export type ElementId = z.infer<typeof ElementId>
export type SlideId = z.infer<typeof SlideId>
export type DocumentId = z.infer<typeof DocumentId>
export type Canvas = z.infer<typeof Canvas>
export type TypeStyle = z.infer<typeof TypeStyle>
export type ThemeSpec = z.infer<typeof ThemeSpec>
export type Asset = z.infer<typeof Asset>
export type DeckFlag = z.infer<typeof DeckFlag>
export type GenerationState = z.infer<typeof GenerationState>
export type DeckMetadata = z.infer<typeof DeckMetadata>
export type Frame = z.infer<typeof Frame>
export type Origin = z.infer<typeof Origin>
export type TextStyle = z.infer<typeof TextStyle>
export type ColorStyle = z.infer<typeof ColorStyle>
export type EffectStyle = z.infer<typeof EffectStyle>
export type ComponentStyleRef = z.infer<typeof ComponentStyleRef>
export type TextRun = z.infer<typeof TextRun>
export type TextParagraph = z.infer<typeof TextParagraph>
export type DiagramSpec = z.infer<typeof DiagramSpec>
export type TextElement = z.infer<typeof TextElement>
export type ImageElement = z.infer<typeof ImageElement>
export type ShapeElement = z.infer<typeof ShapeElement>
export type IconElement = z.infer<typeof IconElement>
export type SvgElement = z.infer<typeof SvgElement>
export type DiagramElement = z.infer<typeof DiagramElement>
export type GroupElement = z.infer<typeof GroupElement>
export type Element = z.infer<typeof Element>
export type TemplateRef = z.infer<typeof TemplateRef>
export type Slide = z.infer<typeof Slide>
export type Deck = z.infer<typeof Deck>

type MigratableDocument = Record<string, unknown>
type Migration = (document: MigratableDocument) => MigratableDocument

function isRecord(value: unknown): value is MigratableDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstKey(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback
  const [first] = Object.keys(value)
  return first ?? fallback
}

/**
 * v1 themes carry no `componentStyles`/`effects`. The conservative default
 * points every role at whichever color/type role the theme already declares
 * first, so a resolved reference is never dangling, and sets every effect's
 * intensity to 0 — a migrated deck renders with no new visual effect at all.
 */
function conservativeThemeDefaults(theme: MigratableDocument) {
  const colorRef = firstKey(theme.colorRoles, 'ink')
  const textRef = firstKey(theme.typeStyles, 'body')
  const componentStyle = { backgroundRef: colorRef, borderRef: colorRef, textRef }
  return {
    componentStyles: { panel: componentStyle, badge: componentStyle, stat: componentStyle },
    effects: {
      halftone: { colorRef, intensity: 0 },
      'hard-shadow': { colorRef, intensity: 0 },
      'editorial-rule': { colorRef, intensity: 0 }
    }
  }
}

const migrations: Record<number, Migration> = {
  0: (document) => ({ ...document, schemaVersion: 1 }),
  1: (document) => {
    const next: MigratableDocument = { ...document, schemaVersion: 2 }
    if (isRecord(next.theme)) {
      const theme = next.theme
      const defaults = conservativeThemeDefaults(theme)
      next.theme = {
        ...theme,
        componentStyles: theme.componentStyles ?? defaults.componentStyles,
        effects: theme.effects ?? defaults.effects
      }
    }
    return next
  },
  2: (document) => document
}

export type MigrationResult = {
  deck: Deck
  original: unknown
}

export function migrateWithSnapshot(document: unknown): MigrationResult {
  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    throw new Error('A deck document must be an object')
  }

  const original = structuredClone(document)
  let current = structuredClone(document) as MigratableDocument
  const declaredVersion = current.schemaVersion
  let version = declaredVersion === undefined ? 0 : declaredVersion

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new Error('schemaVersion must be a non-negative integer')
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${version}`)
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = migrations[version]
    if (!migration) throw new Error(`Missing migration from schema version ${version}`)
    current = migration(current)
    version += 1
  }

  const identityMigration = migrations[CURRENT_SCHEMA_VERSION]
  if (!identityMigration) throw new Error(`Missing migration for schema version ${CURRENT_SCHEMA_VERSION}`)

  return { deck: Deck.parse(identityMigration(current)), original }
}

export function migrate(document: unknown): Deck {
  return migrateWithSnapshot(document).deck
}

export type SafeParseDeckResult = { ok: true; deck: Deck } | { ok: false; issues: z.ZodIssue[] }

export function safeParseDeck(document: unknown): SafeParseDeckResult {
  const result = Deck.safeParse(document)
  return result.success ? { ok: true, deck: result.data } : { ok: false, issues: result.error.issues }
}
