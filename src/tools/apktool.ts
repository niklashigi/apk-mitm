import { join as joinPath } from 'path'
import { ExecaChildProcess } from 'execa'
import { map } from 'rxjs/operators'
import chalk from 'chalk'

import executeJar from '../utils/execute-jar'
import observeProcess from '../utils/observe-process'

const defaultPath = joinPath(__dirname, '../../jar/apktool.jar')

export default class Apktool {
  constructor(private customPath?: string) {}

  decode(inputPath: string, outputPath: string) {
    return observeApktool(
      executeJar(this.path, ['decode', inputPath, '--output', outputPath]),
    )
  }

  encode(inputPath: string, outputPath: string) {
    return observeApktool(
      executeJar(this.path, ['build', inputPath, '--output', outputPath, '--use-aapt2']),
    )
  }

  private get path() {
    return this.customPath || defaultPath
  }

  get version() {
    return this.customPath ? chalk.italic('custom version') : Apktool.version
  }

  static version = 'v2.4.1 SNAPSHOT@197d46'
}

function observeApktool(process: ExecaChildProcess) {
  return map((line: string) => line.replace(/I: /g, ''))(observeProcess(process))
}
