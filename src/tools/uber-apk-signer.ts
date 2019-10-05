import * as path from 'path'

import executeJar from '../utils/execute-jar'

const jar = path.join(__dirname, '../../jar/uber-apk-signer.jar')

const uberApkSigner = {
  sign(inputPath: string) {
    return executeJar(jar, ['--apks', inputPath])
  },
  version: 'v1.1.0',
}

export default uberApkSigner
