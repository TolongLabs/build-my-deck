import { describe, expect, test } from 'bun:test'
import { GenerationSemaphore } from '../src/concurrency/generation-semaphore'
import { PLAYWRIGHT_JOB_CAPACITY, PlaywrightJobSemaphore } from '../src/concurrency/playwright-semaphore'
import { Semaphore } from '../src/concurrency/semaphore'

describe('Semaphore', () => {
  test('tryAcquire fails fast once capacity is exhausted', () => {
    const semaphore = new Semaphore(2)
    const first = semaphore.tryAcquire()
    const second = semaphore.tryAcquire()
    const third = semaphore.tryAcquire()

    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(third).toBeUndefined()
  })

  test('releasing frees a slot for the next tryAcquire', () => {
    const semaphore = new Semaphore(1)
    const release = semaphore.tryAcquire()
    expect(semaphore.tryAcquire()).toBeUndefined()

    release?.()
    expect(semaphore.tryAcquire()).toBeDefined()
  })

  test('acquire queues and resolves once a slot is released', async () => {
    const semaphore = new Semaphore(1)
    const release = semaphore.tryAcquire()
    expect(release).toBeDefined()

    let acquiredSecond = false
    const pending = semaphore.acquire().then((releaseSecond) => {
      acquiredSecond = true
      return releaseSecond
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(acquiredSecond).toBe(false)

    release?.()
    await pending
    expect(acquiredSecond).toBe(true)
  })

  test('a queued acquire rejects if its signal aborts before a slot frees', async () => {
    const semaphore = new Semaphore(1)
    semaphore.tryAcquire()

    const controller = new AbortController()
    const pending = semaphore.acquire(controller.signal)
    controller.abort()

    await expect(pending).rejects.toThrow()
  })
})

describe('GenerationSemaphore', () => {
  test('returns a typed capacity_busy with a retry hint once exhausted, never a queue', () => {
    const semaphore = new GenerationSemaphore(1)
    const first = semaphore.tryAcquire()
    const second = semaphore.tryAcquire()

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.error.code).toBe('capacity_busy')
      expect(second.error.retryAfterMs).toBeGreaterThan(0)
    }
  })
})

describe('PlaywrightJobSemaphore', () => {
  test('is capped at one initial browser job', () => {
    expect(PLAYWRIGHT_JOB_CAPACITY).toBe(1)
  })

  test('a second job waits rather than failing immediately, until the first releases', async () => {
    const semaphore = new PlaywrightJobSemaphore()
    const release = await semaphore.acquire()

    let secondAcquired = false
    const pending = semaphore.acquire().then((releaseSecond) => {
      secondAcquired = true
      return releaseSecond
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(secondAcquired).toBe(false)

    release()
    await pending
    expect(secondAcquired).toBe(true)
  })

  test('disconnect (an aborted signal) cancels a waiting job instead of leaving it queued forever', async () => {
    const semaphore = new PlaywrightJobSemaphore()
    await semaphore.acquire()

    const controller = new AbortController()
    const pending = semaphore.acquire(controller.signal)
    controller.abort()

    await expect(pending).rejects.toThrow()
  })
})
