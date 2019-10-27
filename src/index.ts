import * as path from 'path'
import * as fs from './utils/fs'

import Listr from 'listr'
import tempy from 'tempy'
import chalk from 'chalk'
import { Observable } from 'rxjs'

const { version } = require('../package.json')

import modifyManifest from './tasks/modify-manifest'
import modifyNetworkSecurityConfig from './tasks/modify-netsec-config'
import disableCertificatePinning from './tasks/disable-certificate-pinning'

import uberApkSigner from './tools/uber-apk-signer'
import Apktool from './tools/apktool'

type Options = {
  apktoolPath?: string,
}

export default async function prepareApk(apkPath: string, options: Options) {
  const apktool = new Apktool(options.apktoolPath)

  console.log(chalk`
  {dim ╭} {blue {bold apk-mitm} v${version}}
  {dim ├ {bold apktool} ${apktool.version}
  ╰ {bold uber-apk-signer} ${uberApkSigner.version}}
  `)

  apkPath = path.resolve(process.cwd(), apkPath)

  const finishedApkName = `${path.basename(apkPath, '.apk')}-patched.apk`
  const finishedApkPath = path.join(path.dirname(apkPath), finishedApkName)

  const tmpDir = tempy.directory()
  console.log(chalk.dim(`  Using temporary directory:\n  ${tmpDir}\n`))

  const decodeDir = path.join(tmpDir, 'decode')
  const unsignedApkPath = path.join(tmpDir, 'unsigned.apk')

  let fallBackToAapt = false
  let usesAppBundle = false
  let nscName: string

  await new Listr([
    {
      title: 'Decoding APK file',
      task: () => apktool.decode(apkPath, decodeDir),
    },
    {
      title: 'Modifying app manifest',
      task: async () => {
        const result = await modifyManifest(path.join(decodeDir, 'AndroidManifest.xml'))
        nscName = result.nscName
        usesAppBundle = result.usesAppBundle
      },
    },
    {
      title: 'Modifying network security config',
      task: () => modifyNetworkSecurityConfig(path.join(decodeDir, `res/xml/${nscName}.xml`)),
    },
    {
      title: 'Disabling certificate pinning',
      task: (_, task) => disableCertificatePinning(decodeDir, task),
    },
    {
      title: 'Encoding patched APK file',
      task: () => new Listr([
        {
          title: 'Encoding using AAPT2',
          task: (_, task) => new Observable(subscriber => {
            apktool.encode(decodeDir, unsignedApkPath, true).subscribe(
              line => subscriber.next(line),
              () => {
                subscriber.complete()
                task.skip('Failed, falling back to AAPT...')
                fallBackToAapt = true
              },
              () => subscriber.complete(),
            )
          }),
        },
        {
          title: chalk`Encoding using AAPT {dim [fallback]}`,
          skip: () => !fallBackToAapt,
          task: () => apktool.encode(decodeDir, unsignedApkPath, false),
        }
      ]),
    },
    {
      title: 'Signing patched APK file',
      task: () => new Observable(subscriber => {
        (async () => {
          await uberApkSigner.sign(unsignedApkPath)
            .forEach(line => subscriber.next(line))

          await fs.copyFile(
            path.join(tmpDir, 'unsigned-aligned-debugSigned.apk'),
            finishedApkPath,
          )

          subscriber.complete()
        })()
      }),
    },
  ]).run().catch(error => {
    console.error(
      chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
      error.toString(),
    )

    process.exit(1)
  })

  if (usesAppBundle) {
    console.log(
      chalk`{yellow
  {inverse.bold  WARNING }

  This app seems to be using {bold Android App Bundle} which is dependent on Google Play.
  As a result, installing it through an APK is probably {bold not going to work},
  regardless of whether it has been patched by apk-mitm or not.}`
    )
  }

  console.log(chalk`
  {green.inverse  Done! } Patched APK: {bold ./${finishedApkName}}
  `)
}
