import { DesignSystem as DesignSystemSchema } from '../schema'
import type { DesignSystem } from '../schema'
import { brutalist } from './brutalist'
import { comic } from './comic'
import { editorial } from './editorial'

const raw = { editorial, comic, brutalist } as const

/** Validated at import time — a malformed design system fails the module graph, not a test run. */
export const DESIGN_SYSTEMS: Record<string, DesignSystem> = Object.fromEntries(
  Object.entries(raw).map(([id, system]) => [id, DesignSystemSchema.parse(system)])
)

export const DESIGN_SYSTEM_IDS = Object.keys(DESIGN_SYSTEMS)

export { brutalist, comic, editorial }
