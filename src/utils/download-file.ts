import * as fs from './fs'
import { Observable } from 'rxjs'
import followRedirects = require('follow-redirects')
const { https } = followRedirects

export default function downloadFile(url: string, path: string) {
  return new Observable(subscriber => {
    https
      .get(url, response => {
        if (response.statusCode !== 200) {
          const error = new Error(
            `The URL "${url}" returned status code ${response.statusCode}, expected 200.`,
          )

          // Cancel download with error
          response.destroy(error)
        }

        const fileStream = fs.createWriteStream(path)

        const totalLength = parseInt(response.headers['content-length'])
        let currentLength = 0

        const reportProgress = () => {
          const percentage = currentLength / totalLength
          subscriber.next(
            `${(percentage * 100).toFixed(2)}% done (${formatBytes(
              currentLength,
            )} / ${formatBytes(totalLength)} MB)`,
          )
        }
        reportProgress()

        response.pipe(fileStream)

        response.on('data', (chunk: Buffer) => {
          currentLength += chunk.byteLength
          reportProgress()
        })
        response.on('error', error => subscriber.error(error))

        fileStream.on('close', () => subscriber.complete())
      })
      .on('error', error => subscriber.error(error))
  })
}

function formatBytes(bytes: number) {
  return (bytes / 1000000).toFixed(2)
}
