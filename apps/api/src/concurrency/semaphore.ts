/**
 * A capacity-bounded semaphore with two acquisition modes: `tryAcquire` fails fast
 * (used for the generation semaphore's typed `capacity_busy`), `acquire` queues and waits,
 * honouring an optional `AbortSignal` (used for the Playwright job semaphore, where a
 * second browser job waits under the declared policy rather than failing immediately).
 */
export class Semaphore {
  #capacity: number
  #inUse = 0
  #queue: Array<{ resolve: (release: () => void) => void; reject: (reason: unknown) => void }> = []

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new Error('Semaphore capacity must be a positive integer')
    this.#capacity = capacity
  }

  get available(): number {
    return this.#capacity - this.#inUse
  }

  tryAcquire(): (() => void) | undefined {
    if (this.#inUse >= this.#capacity) return undefined
    this.#inUse += 1
    return this.#makeRelease()
  }

  acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(new Error('aborted'))

    const immediate = this.tryAcquire()
    if (immediate) return Promise.resolve(immediate)

    return new Promise((resolve, reject) => {
      const entry = {
        resolve: (release: () => void) => {
          signal?.removeEventListener('abort', onAbort)
          resolve(release)
        },
        reject
      }
      const onAbort = () => {
        const index = this.#queue.indexOf(entry)
        if (index >= 0) this.#queue.splice(index, 1)
        reject(new Error('aborted'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      this.#queue.push(entry)
    })
  }

  #makeRelease(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.#inUse -= 1
      const next = this.#queue.shift()
      if (next) {
        this.#inUse += 1
        next.resolve(this.#makeRelease())
      }
    }
  }
}
