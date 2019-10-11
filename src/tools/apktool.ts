import * as path from 'path'

import executeJar from '../utils/execute-jar'

const jar = path.join(__dirname, '../../jar/apktool.jar')

const apktool = {
  decode(inputPath: string, outputPath: string) {
    return executeJar(jar, ['decode', inputPath, '--output', outputPath])
  },
  encode(inputPath: string, outputPath: string) {
    return executeJar(jar, ['build', inputPath, '--output', outputPath, '--use-aapt2'])
  },
  version: 'v2.4.1 SNAPSHOT@197d46',
}

export default apktool
