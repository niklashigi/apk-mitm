import * as path from 'path'

import { executeJar } from '../utils/execute-jar'
import observeProcess from '../utils/observe-process'

const jar = path.join(__dirname, '../../jar/uber-apk-signer.jar')

type Options = { zipalign?: boolean }

const uberApkSigner = {
  sign: (inputPaths: string[], { zipalign = false }: Options = {}) => {
    const pathArgs = []
    for (const path of inputPaths) {
      pathArgs.push('--apks', path)
    }

    return observeProcess(
      executeJar(jar, [
        '--allowResign',
        '--overwrite',
        ...(zipalign ? [] : ['--skipZipAlign']),
        ...pathArgs,
      ]),
    )
  },
  version: 'v1.1.0',
}

export default uberApkSigner
