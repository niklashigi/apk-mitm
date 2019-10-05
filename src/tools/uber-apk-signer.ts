import * as path from 'path'
import execa from 'execa'

const jar = path.join(__dirname, '../../jar/uber-apk-signer.jar')

const uberApkSigner = {
  sign(inputPath: string) {
    return execa('java', ['-jar', jar,
      '--apks', inputPath,
    ])
  },
  version: 'v1.1.0',
}

export default uberApkSigner
