import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as https from 'https'
import execa = require('execa')
import { map } from 'rxjs/operators'
import chalk = require('chalk')

import { executeJar } from '../utils/execute-jar'
import observeProcess from '../utils/observe-process'
import Tool from './tool'

interface ApktoolOptions {
  frameworkPath: string
  customPath?: string
}

const FALLBACK_VERSION = '3.0.3'

export default class Apktool extends Tool {
  private selectedVersion = {
    name: `v${FALLBACK_VERSION}`,
    downloadUrl:
      'https://github.com/iBotPeaches/Apktool/releases/download/' +
      `v${FALLBACK_VERSION}/apktool_${FALLBACK_VERSION}.jar`,
  }
  private majorVersion = 3

  constructor(private options: ApktoolOptions) {
    super()
  }

  async selectLatestVersion() {
    if (this.options.customPath) return

    try {
      const release = await new Promise<{
        tag_name: string
        assets: { name: string; browser_download_url: string }[]
      }>((resolve, reject) => {
        const request = https.get(
          'https://api.github.com/repos/iBotPeaches/Apktool/releases/latest',
          { headers: { 'User-Agent': 'apk-mitm' } },
          response => {
            if (response.statusCode !== 200) {
              response.resume()
              reject(new Error(`GitHub returned ${response.statusCode}`))
              return
            }

            let body = ''
            response.setEncoding('utf8')
            response.on('data', chunk => (body += chunk))
            response.on('end', () => {
              try {
                resolve(JSON.parse(body))
              } catch (error) {
                reject(error)
              }
            })
            response.on('error', reject)
          },
        )
        request.setTimeout(10000, () => request.destroy(new Error('Timed out')))
        request.on('error', reject)
      })

      const version = /^v?(\d+\.\d+\.\d+)$/.exec(release.tag_name)?.[1]
      const jar = release.assets.find(
        asset => asset.name === `apktool_${version}.jar`,
      )
      if (version && jar) {
        this.selectedVersion = {
          name: `v${version}`,
          downloadUrl: jar.browser_download_url,
        }
      }
    } catch {
      console.warn(
        `Could not check the latest Apktool release; using v${FALLBACK_VERSION}.`,
      )
    }
  }

  async checkVersion() {
    const { stdout } = await execa('java', ['-jar', this.path, '--version'])
    const majorVersion = /^(\d+)\./.exec(stdout.trim())?.[1]
    if (!majorVersion)
      throw new Error(`Could not determine Apktool version: ${stdout}`)
    this.majorVersion = Number(majorVersion)
  }

  get supportsAaptFallback() {
    return this.majorVersion < 3
  }

  installFrameworkFromSdk() {
    const androidJar = findLatestAndroidPlatform()
    if (!androidJar) return

    return this.run(
      [
        'install-framework',
        androidJar,
        '--frame-path',
        this.options.frameworkPath,
      ],
      'framework',
    )
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
        ...(useAapt2 && this.supportsAaptFallback ? ['--use-aapt2'] : []),
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
    return this.selectedVersion
  }
}

function findLatestAndroidPlatform() {
  const sdkPaths = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
  ]

  for (const sdkPath of sdkPaths) {
    if (!sdkPath) continue

    const platformsPath = path.join(sdkPath, 'platforms')
    if (!fs.existsSync(platformsPath)) continue

    const platforms = fs.readdirSync(platformsPath)
    const candidates = platforms
      .map(name => {
        const version = /^android-(\d+)(?:\.(\d+))?$/.exec(name)
        return (
          version && {
            path: path.join(platformsPath, name, 'android.jar'),
            api: Number(version[1]),
            minor: Number(version[2] || 0),
          }
        )
      })
      .filter(
        (platform): platform is { path: string; api: number; minor: number } =>
          !!platform && fs.existsSync(platform.path),
      )
      .sort(
        (first, second) => second.api - first.api || second.minor - first.minor,
      )

    if (candidates.length) return candidates[0].path
  }
}
