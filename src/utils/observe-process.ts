import * as fs from '../utils/fs'
import * as pathUtils from 'path'
import { ExecaChildProcess } from 'execa'
import { Observable } from 'rxjs'

export default function observeProcess(
  process: ExecaChildProcess,
  logName: string,
): Observable<string> {
  return new Observable(subscriber => {
    (async () => {
      await fs.mkdir('logs', { recursive: true })

      const fileName = pathUtils.join('logs', `${logName}.log`)
      const failedFileName = pathUtils.join('logs', `${logName}.failed.log`)
      const stream = fs.createWriteStream(fileName)

      process
        .then(() => {
          stream.close()
          subscriber.complete()
        })
        .catch(async error => {
          stream.close()
          await fs.rename(fileName, failedFileName)

          subscriber.error(error)
        })

      process.stdout.on('data', (data: Buffer) => {
        subscriber.next(data.toString().trim())
        stream.write(data)
      })
      process.stderr.on('data', (data: Buffer) => stream.write(data))
    })()
  })
}
