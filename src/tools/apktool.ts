import { map } from 'rxjs/operators'
import chalk from 'chalk'

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
    return this.options.customPath || this.jarPath
  }

  name = 'apktool'
  get version() {
    if (this.options.customPath)
      return { name: chalk.italic('custom version') }

    const versionNumber = '2.4.1'

    return {
      name: `v${versionNumber}`,
      downloadUrl:
        'https://github.com/iBotPeaches/Apktool/releases/download'
        + `/v${versionNumber}/apktool_${versionNumber}.jar`
    }
  }
}
