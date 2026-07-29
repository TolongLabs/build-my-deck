import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { requestSizeLimit } from '../src/request-limits'

function appWithLimit(maxInputBytes: number): Hono {
  const app = new Hono()
  app.use('*', requestSizeLimit(maxInputBytes))
  app.post('/echo', async (c) => {
    const body = await c.req.text()
    return c.json({ receivedBytes: new TextEncoder().encode(body).length })
  })
  return app
}

describe('requestSizeLimit', () => {
  test('a body within the limit reaches the downstream handler unchanged', async () => {
    const app = appWithLimit(1_000)
    const response = await app.request('/echo', { method: 'POST', body: 'small payload' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ receivedBytes: 'small payload'.length })
  })

  test('a declared Content-Length over the limit is rejected before the handler runs', async () => {
    const app = appWithLimit(10)
    const response = await app.request('/echo', {
      method: 'POST',
      headers: { 'content-length': '10000' },
      body: 'x'.repeat(10_000)
    })

    expect(response.status).toBe(413)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('input_too_large')
  })

  test('a chunked body without Content-Length is still bounded by a byte count', async () => {
    const app = appWithLimit(10)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(20)))
        controller.close()
      }
    })

    const response = await app.request('/echo', {
      method: 'POST',
      body: stream,
      duplex: 'half'
    } as RequestInit)

    expect(response.status).toBe(413)
  })

  test('a 200-page-equivalent payload triggers zero downstream calls', async () => {
    let handlerCalls = 0
    const app = new Hono()
    app.use('*', requestSizeLimit(1_000))
    app.post('/generate', async (c) => {
      handlerCalls += 1
      return c.json({ ok: true })
    })

    const oversized = 'x'.repeat(2_000_000)
    const response = await app.request('/generate', { method: 'POST', body: oversized })

    expect(response.status).toBe(413)
    expect(handlerCalls).toBe(0)
  })
})
