import { executeBin } from '../utils/execute'
import observeProcess from '../utils/observe-process'

const compression = {
  unzip: (inputFile: string, destinationFolder: string) => observeProcess(
    executeBin('unzip', [
      inputFile,
      '-d', destinationFolder,
    ])
  ),
  zip: (outputPath: string, inputFiles: string[]) =>observeProcess(
    executeBin('zip', [
      outputPath,
      ...inputFiles
    ])
  ),
}

export default compression
