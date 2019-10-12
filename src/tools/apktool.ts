import { ExecaChildProcess } from 'execa'
import * as path from 'path'
import { map } from 'rxjs/operators'

import executeJar from '../utils/execute-jar'
import observeProcess from '../utils/observe-process'

const jar = path.join(__dirname, '../../jar/apktool.jar')

const apktool = {
  decode: (inputPath: string, outputPath: string) => observeApktool(
    executeJar(jar, ['decode', inputPath, '--output', outputPath]),
  ),
  encode: (inputPath: string, outputPath: string) => observeApktool(
    executeJar(jar, ['build', inputPath, '--output', outputPath, '--use-aapt2']),
  ),
  version: 'v2.4.1 SNAPSHOT@197d46',
}

function observeApktool(process: ExecaChildProcess) {
  return map((line: string) => line.replace(/I: /g, ''))(observeProcess(process))
}

export default apktool
