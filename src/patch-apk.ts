import * as path from 'path'
import * as fs from './utils/fs'
import { Observable } from 'rxjs'
import Listr from 'listr'
import chalk from 'chalk'

import { TaskOptions } from './cli'
import modifyManifest from './tasks/modify-manifest'
import modifyNetworkSecurityConfig from './tasks/modify-netsec-config'
import disableCertificatePinning from './tasks/disable-certificate-pinning'
import uberApkSigner from './tools/uber-apk-signer'

export default function patchApk({ inputPath, outputPath, tmpDir, apktool }: TaskOptions) {
  const decodeDir = path.join(tmpDir, 'decode')
  const tmpApkPath = path.join(tmpDir, 'tmp.apk')

  let fallBackToAapt = false
  let nscName: string

  return new Listr([
    {
      title: 'Decoding APK file',
      task: () => apktool.decode(inputPath, decodeDir),
    },
    {
      title: 'Modifying app manifest',
      task: async (context) => {
        const result = await modifyManifest(
          path.join(decodeDir, 'AndroidManifest.xml'),
        )
        nscName = result.nscName

        context.usesAppBundle = result.usesAppBundle
      },
    },
    {
      title: 'Modifying network security config',
      task: () => modifyNetworkSecurityConfig(
        path.join(decodeDir, `res/xml/${nscName}.xml`),
      ),
    },
    {
      title: 'Disabling certificate pinning',
      task: (_, task) => disableCertificatePinning(decodeDir, task),
    },
    {
      title: 'Encoding patched APK file',
      task: () =>
        new Listr([
          {
            title: 'Encoding using AAPT2',
            task: (_, task) => new Observable(subscriber => {
              apktool.encode(decodeDir, tmpApkPath, true).subscribe(
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
            task: () => apktool.encode(decodeDir, tmpApkPath, false),
          },
        ])
    },
    {
      title: 'Signing patched APK file',
      task: () => new Observable(subscriber => {
        (async () => {
          await uberApkSigner
            .sign([tmpApkPath], { zipalign: true })
            .forEach(line => subscriber.next(line))

          await fs.copyFile(tmpApkPath, outputPath)

          subscriber.complete()
        })()
      }),
    },
  ])
}

export function showAppBundleWarning() {
  console.log(chalk`{yellow
  {inverse.bold  WARNING }

  This app seems to be using {bold Android App Bundle} which means that you
  will likely run into problems installing it. That's because this app
  is made out of {bold multiple APK files} and you've only got one of them.

  If you want to patch an app like this with {bold apk-mitm}, you'll have to
  supply it with all the APKs. You have two options for doing this:

  – download a {bold *.xapk} file {dim (for example from https://apkpure.com​)}
  – export a {bold *.apks} file {dim (using https://github.com/Aefyr/SAI​)}

  You can then run {bold apk-mitm} again with that file to patch the bundle.}`)
}
