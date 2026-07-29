import { z } from 'zod'

export interface SchemaLintIssue {
  path: string
  keyword: string
  message: string
}

/**
 * Zod's JSON Schema emission produces constructs several providers reject at request time
 * (`$ref`, `oneOf` on discriminated unions, ...). This rejects them before any network call.
 */
export class SchemaLintError extends Error {
  readonly issues: SchemaLintIssue[]

  constructor(issues: SchemaLintIssue[]) {
    super(
      `Schema uses unsupported keyword(s): ${issues.map((issue) => `${issue.path || '<root>'}:${issue.keyword}`).join(', ')}`
    )
    this.name = 'SchemaLintError'
    this.issues = issues
  }
}

const UNSUPPORTED_KEYWORDS = [
  '$ref',
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  'if',
  'then',
  'else',
  'patternProperties',
  '$defs',
  'definitions'
] as const

function walk(node: unknown, path: string, issues: SchemaLintIssue[]): void {
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) walk(item, `${path}[${index}]`, issues)
    return
  }
  if (typeof node !== 'object' || node === null) return

  const record = node as Record<string, unknown>
  for (const keyword of UNSUPPORTED_KEYWORDS) {
    if (Object.hasOwn(record, keyword)) {
      issues.push({ path, keyword, message: `Unsupported keyword "${keyword}" at ${path || '<root>'}` })
    }
  }
  for (const [key, value] of Object.entries(record)) {
    walk(value, path ? `${path}.${key}` : key, issues)
  }
}

/** Rejects unsupported keywords found anywhere in the schema tree. */
export function lintPortableSchema(jsonSchema: Record<string, unknown>): void {
  const issues: SchemaLintIssue[] = []
  walk(jsonSchema, '', issues)
  if (issues.length > 0) throw new SchemaLintError(issues)
}

/**
 * Emits the portable subset and lints it before returning — reused subschemas are inlined
 * rather than `$ref`'d, since discriminated-union `oneOf` is the one shape Zod's default
 * emission produces that the linter above already forbids.
 */
export function toPortableJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7', reused: 'inline' }) as Record<string, unknown>
  lintPortableSchema(jsonSchema)
  return jsonSchema
}
