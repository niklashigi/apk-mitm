import { ExecaChildProcess } from 'execa'
import { Observable } from 'rxjs'

export default function observeProcess(process: ExecaChildProcess): Observable<string> {
  return new Observable(subscriber => {
    process
      .then(() => subscriber.complete())
      .catch(error => subscriber.error(error))

    process.stdout.on('data', (data: Buffer) => {
      subscriber.next(data.toString().trim())
    })
  })
}
