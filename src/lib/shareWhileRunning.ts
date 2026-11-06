/**
 * Calls that arrive while a run is in progress get that run's result
 * instead of starting another one. For expensive actions that must not run
 * side by side, such as creating a backup
 */
export function shareWhileRunning<T>(run: () => Promise<T>): () => Promise<T> {
  let running: Promise<T> | null = null
  return () => {
    running ??= run().finally(() => {
      running = null
    })
    return running
  }
}
