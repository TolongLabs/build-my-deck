import { Semaphore } from './semaphore'

/** Q13: pinned Playwright inside the single API container, initially capped at one browser job. */
export const PLAYWRIGHT_JOB_CAPACITY = 1

/** A second job waits under this policy rather than failing immediately; disconnect aborts the wait. */
export class PlaywrightJobSemaphore {
  #semaphore = new Semaphore(PLAYWRIGHT_JOB_CAPACITY)

  get available(): number {
    return this.#semaphore.available
  }

  acquire(signal?: AbortSignal): Promise<() => void> {
    return this.#semaphore.acquire(signal)
  }
}
