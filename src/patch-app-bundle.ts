import { Observable } from 'rxjs'
import * as path from 'path'
import globby from 'globby'
import Listr from 'listr'

import uberApkSigner from './tools/uber-apk-signer'
import compression from './tools/compression'
import patchApk from './patch-apk'
import { TaskOptions } from './cli'

export default function patchAppBundle({ inputPath, outputPath, tmpDir, apktool }: TaskOptions) {
  const bundleDir = path.join(tmpDir, 'bundle')
  const baseApkPath = path.join(bundleDir, 'base.apk')

  return new Listr(
    [
      {
        title: 'Extracting APKs',
        task: () => compression.unzip(inputPath, bundleDir),
      },
      {
        title: 'Patching base APK',
        task: () => patchApk({
          inputPath: baseApkPath, outputPath: baseApkPath,
          tmpDir: path.join(tmpDir, 'base-apk'), apktool,
        }),
      },
      {
        title: 'Signing APKs',
        task: () => new Observable(subscriber => {
          (async () => {
            const apkFiles = await globby(path.join(bundleDir, '**/*.apk'))

            await uberApkSigner
              .sign(apkFiles, { zipalign: false })
              .forEach(line => subscriber.next(line))

            subscriber.complete()
          })()
        }),
      },
      {
        title: 'Compressing APKs',
        task: async () => {
          const bundleFiles = await globby(path.join(bundleDir, '**/*.apk'))
          return compression.zip(outputPath, bundleFiles)
        },
      },
    ],
  )
}
