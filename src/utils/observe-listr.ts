import Listr = require('listr')
import { Observable, Subscriber } from 'rxjs'

/**
 * Takes in a `Listr` instance, runs it, and reports on its progress through the
 * `Observable` it returns. This can be useful for executing one of the many
 * `Listr`-based functions while redirecting its output somewhere other than
 * standard output.
 *
 * Originally added for [APK Lab](https://github.com/Surendrajat/APKLab)'s
 * integration of apk-mitm.
 */
export default function observeListr(listr: Listr): Observable<string> {
  return new Observable(subscriber => {
    latestSubscriber = subscriber
    listr.setRenderer(ObservableRenderer)
    listr.run().catch(() => {})
  })
}

/**
 * "Handover variable" that allow `observeListr` to pass its `Subscriber` to the
 * `ObservableRenderer` which is instantiated by Listr interally.
 */
let latestSubscriber: Subscriber<string>

class ObservableRenderer implements Listr.ListrRenderer {
  private subscriber: Subscriber<string>

  constructor(private tasks: Listr.ListrTaskObject<any>[]) {
    this.subscriber = latestSubscriber
  }

  static get nonTTY() {
    return true
  }

  render() {
    for (const task of this.tasks) {
      task.subscribe(event => {
        if (event.type === 'STATE') {
          if (task.isPending()) {
            return this.subscriber.next(`=> ${task.title}`)
          } else if (task.isSkipped()) {
            return this.subscriber.next(task.output ?? '')
          }
        } else if (event.type === 'DATA' && !task.hasFailed()) {
          this.subscriber.next(`${event.data}`)
        }
      })
    }
  }

  end(error: Error) {
    if (error) return this.subscriber.error(error)
    this.subscriber.complete()
  }
}
