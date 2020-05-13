import { join as joinPath } from 'path'
import { map } from 'rxjs/operators'
import chalk from 'chalk'

import { executeJar } from '../utils/execute-jar'
import observeProcess from '../utils/observe-process'

const defaultPath = joinPath(__dirname, '../../jar/apktool.jar')

interface ApktoolOptions {
  frameworkPath: string
  customPath?: string
}

export default class Apktool {
  constructor(private options: ApktoolOptions) {}

  decode(inputPath: string, outputPath: string) {
    return this.run([
      'decode', inputPath,
      '--output', outputPath,
      '--frame-path', this.options.frameworkPath,
    ])
  }

  encode(inputPath: string, outputPath: string, useAapt2: boolean) {
    return this.run([
      'build', inputPath,
      '--output', outputPath,
      '--frame-path', this.options.frameworkPath,
      ...(useAapt2 ? ['--use-aapt2'] : []),
    ])
  }

  private run(args: string[]) {
    return map((line: string) => line.replace(/I: /g, ''))(
      observeProcess(executeJar(this.path, args)),
    )
  }

  private get path() {
    return this.options.customPath || defaultPath
  }

  get version() {
    return this.options.customPath
      ? chalk.italic('custom version')
      : Apktool.bundledVersion
  }

  static bundledVersion = 'v2.4.1'
}
