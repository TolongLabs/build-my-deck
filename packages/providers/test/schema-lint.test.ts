import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { SchemaLintError, lintPortableSchema, toPortableJsonSchema } from '../src/schema-lint'

describe('schema linter', () => {
  test('passes a flat strict object schema', () => {
    const schema = z.strictObject({ headline: z.string(), bullets: z.array(z.string()).max(4) })
    const jsonSchema = toPortableJsonSchema(schema)
    expect(jsonSchema.type).toBe('object')
    expect(jsonSchema.additionalProperties).toBe(false)
  })

  test('rejects oneOf emitted by a discriminated union, before any network call', () => {
    const schema = z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('a'), x: z.string() }),
      z.strictObject({ kind: z.literal('b'), y: z.number() })
    ])

    expect(() => toPortableJsonSchema(schema)).toThrow(SchemaLintError)
  })

  test('rejects $ref anywhere in the tree', () => {
    expect(() => lintPortableSchema({ type: 'object', properties: { child: { $ref: '#/$defs/Child' } } })).toThrow(
      SchemaLintError
    )
  })

  test('reports every unsupported keyword found, not just the first', () => {
    try {
      lintPortableSchema({ oneOf: [{ type: 'string' }], patternProperties: { '^x': { type: 'string' } } })
      throw new Error('expected lintPortableSchema to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaLintError)
      const lintError = error as SchemaLintError
      expect(lintError.issues.map((issue) => issue.keyword).sort()).toEqual(['oneOf', 'patternProperties'])
    }
  })
})
