import * as path from 'path'
import * as fs from './utils/fs'

import Listr from 'listr'
import tempy from 'tempy'
import chalk from 'chalk'
import { Observable } from 'rxjs'

const { version } = require('../package.json')

import updateManifest from './tasks/update-manifest'
import modifyNetworkSecurityConfig from './tasks/modify-netsec-config'
import disableCertificatePinning from './tasks/disable-certificate-pinning'
import observeProcess from './utils/observe-process'

import apktool from './tools/apktool'
import uberApkSigner from './tools/uber-apk-signer'

export default async function prepareApk(apkPath: string) {
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

  let nscName: string

  await new Listr([
    {
      title: 'Decoding APK file',
      task: () => observeProcess(
        apktool.decode(apkPath, decodeDir),
      ),
    },
    {
      title: 'Modifying app manifest',
      task: async () => {
        const result = await updateManifest(path.join(decodeDir, 'AndroidManifest.xml'))
        nscName = result.nscName
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
      task: () => observeProcess(
        apktool.encode(decodeDir, unsignedApkPath),
      ),
    },
    {
      title: 'Signing patched APK file',
      task: () => {
        return new Observable(subscriber => {
          (async () => {
            await observeProcess(
              uberApkSigner.sign(unsignedApkPath),
            ).forEach(line => subscriber.next(line))

            await fs.copyFile(
              path.join(tmpDir, 'unsigned-aligned-debugSigned.apk'),
              finishedApkPath,
            )

            subscriber.complete()
          })()
        })
      },
    },
  ]).run().catch(error => {
    console.error(
      chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
      error.toString(),
    )

    process.exit(1)
  })

  console.log(chalk`\n  {green.inverse  Done! } Patched APK: {bold ./${finishedApkName}}\n`)
}
