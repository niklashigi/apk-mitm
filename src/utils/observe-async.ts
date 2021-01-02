import { Observable } from 'rxjs'

/**
 * Wraps an async function and produces an `Observable` that reacts to the
 * function resolving (`complete` notification), rejecting (`error`
 * notification), and calling the `next` callback (`next` notification), making
 * it easier to write `async`/`await`-based code that reports its progress
 * through an `Observable` *without* forgetting to handle errors.
 */
export default function observeAsync<T>(
  fn: (next: (value: T) => void) => Promise<void>,
): Observable<T> {
  return new Observable(subscriber => {
    fn(value => subscriber.next(value))
      .then(() => subscriber.complete())
      .catch(error => subscriber.error(error))
  })
}
