import { type HttpError, capacityBusyError } from '../http-errors'
import { Semaphore } from './semaphore'

/** Fixed, conservative retry hint — no attempt is made to compute an ETA from in-flight runs. */
const GENERATION_RETRY_HINT_MS = 3_000

export type GenerationAcquireResult = { ok: true; release: () => void } | { ok: false; error: HttpError }

/** Fails fast with a typed `capacity_busy` rather than queuing — a queue is a durable-job concern, not this. */
export class GenerationSemaphore {
  #semaphore: Semaphore

  constructor(capacity: number) {
    this.#semaphore = new Semaphore(capacity)
  }

  get available(): number {
    return this.#semaphore.available
  }

  tryAcquire(): GenerationAcquireResult {
    const release = this.#semaphore.tryAcquire()
    if (!release) return { ok: false, error: capacityBusyError(GENERATION_RETRY_HINT_MS) }
    return { ok: true, release }
  }
}
