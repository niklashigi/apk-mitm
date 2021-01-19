import * as fs from './fs'
import * as pathUtils from 'path'
import envPaths = require('env-paths')
import { ListrTask, ListrTaskWrapper } from 'listr'

import Tool from '../tools/tool'
import observeAsync from './observe-async'
import downloadFile from './download-file'

const cachePath = envPaths('apk-mitm', { suffix: '' }).cache

export default function createToolDownloadTask(tool: Tool): ListrTask<any> {
  return {
    title: `Downloading ${tool.name} ${tool.version.name}`,
    task: (_, task: ListrTaskWrapper) => {
      if (!tool.version.downloadUrl) return task.skip('Using custom version')

      const fileName = `${tool.name}-${tool.version.name}.jar`
      return downloadCachedFile(task, tool.version.downloadUrl, fileName)
    },
  }
}

function downloadCachedFile(
  task: ListrTaskWrapper,
  url: string,
  fileName: string,
) {
  return observeAsync(async next => {
    const finalFilePath = getCachedPath(fileName)

    if (await fs.exists(finalFilePath)) {
      task.skip('Version already downloaded!')
      return
    }

    // Ensure cache directory exists
    await fs.mkdir(cachePath, { recursive: true })

    // Prevent file corruption by using a temporary file name
    const downloadFilePath = finalFilePath + '.dl'
    await downloadFile(url, downloadFilePath).forEach(next)
    await fs.rename(downloadFilePath, finalFilePath)
  })
}

export function getCachedPath(name: string) {
  return pathUtils.join(cachePath, name)
}
