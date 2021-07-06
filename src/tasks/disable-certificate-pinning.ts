import globby = require('globby')
import { ListrTaskWrapper } from 'listr'

import observeAsync from '../utils/observe-async'
import processSmaliFile from './smali/process-file'
import buildGlob from '../utils/build-glob'

export default async function disableCertificatePinning(
  directoryPath: string,
  task: ListrTaskWrapper,
) {
  return observeAsync(async log => {
    const smaliGlob = buildGlob(directoryPath, 'smali*/**/*.smali')

    let pinningFound = false

    log('Scanning Smali files...')
    for await (const filePathChunk of globby.stream(smaliGlob)) {
      // Required because Node.js streams are not typed as generics
      const filePath = filePathChunk as string

      const hadPinning = await processSmaliFile(filePath, log)
      if (hadPinning) pinningFound = true
    }

    if (!pinningFound) task.skip('No certificate pinning logic found.')
  })
}
