import type { MiddlewareHandler } from 'hono'
import { inputTooLargeError } from './http-errors'

async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  maxInputBytes: number
): Promise<{ ok: true; bytes: ArrayBuffer } | { ok: false }> {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxInputBytes) {
      await reader.cancel()
      return { ok: false }
    }
    chunks.push(value)
  }

  const bytes = new ArrayBuffer(total)
  const view = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    view.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, bytes }
}

/**
 * Bounds every request body before any downstream handler parses paid content. A fast
 * `content-length` check rejects the common case without reading a byte; a bounded read
 * additionally guards chunked bodies that omit the header.
 */
export function requestSizeLimit(maxInputBytes: number): MiddlewareHandler {
  return async (c, next) => {
    const declaredLength = Number(c.req.header('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > maxInputBytes) {
      const error = inputTooLargeError(maxInputBytes)
      return c.json(error.toResponseBody(), error.status)
    }

    const body = c.req.raw.body
    if (body) {
      const bounded = await readBoundedBody(body, maxInputBytes)
      if (!bounded.ok) {
        const error = inputTooLargeError(maxInputBytes)
        return c.json(error.toResponseBody(), error.status)
      }
      c.req.raw = new Request(c.req.raw, { body: bounded.bytes })
    }

    await next()
  }
}
