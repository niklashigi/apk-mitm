import * as fs from 'fs'
import { promises as fsp } from 'fs'
import * as pathUtils from 'path'
import envPaths = require('env-paths')
import { Observable } from 'rxjs'
import { ListrTaskWrapper } from 'listr'
import followRedirects = require('follow-redirects')
import Tool from '../tools/tool'
const { https } = followRedirects

const cachePath = envPaths('apk-mitm', { suffix: '' }).cache

export default function createToolDownloadTask(tool: Tool) {
  return {
    title: `Downloading ${tool.name} ${tool.version.name}`,
    task: (_, task: ListrTaskWrapper) => {
      if (!tool.version.downloadUrl)
        return task.skip('Using custom version')

      const fileName = `${tool.name}-${tool.version.name}.jar`
      return downloadFile(task, tool.version.downloadUrl, fileName)
    },
  }
}

function downloadFile(
  task: ListrTaskWrapper,
  url: string,
  fileName: string,
) {
  return new Observable(subscriber => {
    (async () => {
      const finalFilePath = getCachedPath(fileName)

      if (fs.existsSync(finalFilePath)) {
        task.skip('Version already downloaded!')
        subscriber.complete()
        return
      }

      // Ensure cache directory exists
      await fsp.mkdir(cachePath, { recursive: true })

      // Prevent file corruption by using a temporary file name
      const downloadFilePath = finalFilePath + '.dl'

      https.get(url, response => {
        if (response.statusCode !== 200) {
          const error = new Error(`The URL "${url}" returned status code ${response.statusCode}, expected 200.`)

          // Cancel download with error
          response.destroy(error)
        }

        const fileStream = fs.createWriteStream(downloadFilePath)

        const totalLength = parseInt(response.headers['content-length'])
        let currentLength = 0

        const reportProgress = () => {
          const percentage = currentLength / totalLength
          subscriber.next(`${(percentage * 100).toFixed(2)}% done (${formatBytes(currentLength)} / ${formatBytes(totalLength)} MB)`)
        }
        reportProgress()

        response.pipe(fileStream)

        response.on('data', (chunk: Buffer) => {
          currentLength += chunk.byteLength
          reportProgress()
        })

        fileStream.on('close', async () => {
          await fsp.rename(downloadFilePath, finalFilePath)
          subscriber.complete()
        })
      }).on('error', error => subscriber.error(error))
    })()
  })
}

export function getCachedPath(name: string) {
  return pathUtils.join(cachePath, name)
}

function formatBytes(bytes: number) {
  return (bytes / 1000000).toFixed(2)
}
