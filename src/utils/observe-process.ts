import * as fs from '../utils/fs'
import * as pathUtils from 'path'
import { ExecaChildProcess } from 'execa'
import { Observable } from 'rxjs'
import observeAsync from './observe-async'

export default function observeProcess(
  process: ExecaChildProcess,
  logName: string,
): Observable<string> {
  return observeAsync(async next => {
    await fs.mkdir('logs', { recursive: true })

    const fileName = pathUtils.join('logs', `${logName}.log`)
    const failedFileName = pathUtils.join('logs', `${logName}.failed.log`)
    const stream = fs.createWriteStream(fileName)

    process.stdout!.on('data', (data: Buffer) => {
      next(data.toString().trim())
      stream.write(data)
    })
    process.stderr!.on('data', (data: Buffer) => stream.write(data))

    try {
      await process
    } catch (error) {
      await fs.rename(fileName, failedFileName)
      throw error
    } finally {
      stream.close()
    }
  })
}
