import * as path from 'path'
import globby = require('globby')
import { ListrTaskWrapper } from 'listr'

import observeAsync from '../utils/observe-async'
import processSmaliFile from './smali/process-file'

export default async function disableCertificatePinning(
  directoryPath: string,
  task: ListrTaskWrapper,
) {
  return observeAsync(async next => {
    // Convert Windows path (using backslashes) to POSIX path (using slashes)
    const directoryPathPosix = directoryPath
      .split(path.sep)
      .join(path.posix.sep)
    const globPattern = path.posix.join(directoryPathPosix, 'smali*/**/*.smali')

    let pinningFound = false

    next('Scanning Smali files...')
    for await (const filePathChunk of globby.stream(globPattern)) {
      // Required because Node.js streams are not typed as generics
      const filePath = filePathChunk as string

      const hadPinning = await processSmaliFile(filePath, next)
      if (hadPinning) pinningFound = true
    }

    if (!pinningFound) task.skip('No certificate pinning logic found.')
  })
}
