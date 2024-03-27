import { map } from 'rxjs/operators'
import chalk = require('chalk')

import { executeJar } from '../utils/execute-jar'
import observeProcess from '../utils/observe-process'
import Tool from './tool'

interface ApktoolOptions {
  frameworkPath: string
  customPath?: string
}

export default class Apktool extends Tool {
  constructor(private options: ApktoolOptions) {
    super()
  }

  decode(inputPath: string, outputPath: string) {
    return this.run(
      [
        'decode',
        inputPath,
        '--output',
        outputPath,
        '--frame-path',
        this.options.frameworkPath,
      ],
      'decoding',
    )
  }

  encode(inputPath: string, outputPath: string, useAapt2: boolean) {
    return this.run(
      [
        'build',
        inputPath,
        '--output',
        outputPath,
        '--frame-path',
        this.options.frameworkPath,
        ...(useAapt2 ? ['--use-aapt2'] : []),
      ],
      `encoding-${useAapt2 ? 'aapt2' : 'aapt'}`,
    )
  }

  private run(args: string[], logName: string) {
    return map((line: string) => line.replace(/I: /g, ''))(
      observeProcess(executeJar(this.path, args), logName),
    )
  }

  private get path() {
    return this.options.customPath || this.jarPath
  }

  name = 'apktool'
  get version() {
    if (this.options.customPath) return { name: chalk.italic('custom version') }

    const versionNumber = '2.9.3'

    return {
      name: `v${versionNumber}`,
      downloadUrl:
        'https://github.com/iBotPeaches/Apktool/releases/download' +
        `/v${versionNumber}/apktool_${versionNumber}.jar`,
    }
  }
}
