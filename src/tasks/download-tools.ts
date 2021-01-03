import Listr from 'listr'

import createToolDownloadTask from '../utils/download-tool'
import { TaskOptions } from '../cli'

export default function downloadTools({ apktool, uberApkSigner }: TaskOptions) {
  return new Listr(
    [createToolDownloadTask(apktool), createToolDownloadTask(uberApkSigner)],
    { concurrent: true },
  )
}
