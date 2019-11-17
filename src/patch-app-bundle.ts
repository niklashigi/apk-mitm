import { unzip, zip } from '@tybys/cross-zip'
import { Observable } from 'rxjs'
import * as fs from './utils/fs'
import * as path from 'path'
import globby from 'globby'
import Listr from 'listr'

import uberApkSigner from './tools/uber-apk-signer'
import patchApk from './patch-apk'
import { TaskOptions } from './cli'

export function patchXapkBundle(options: TaskOptions) {
  return patchAppBundle(options, { isXapk: true })
}

export function patchApksBundle(options: TaskOptions) {
  return patchAppBundle(options, { isXapk: false })
}

function patchAppBundle(
  { inputPath, outputPath, tmpDir, apktool }: TaskOptions,
  { isXapk }: { isXapk: boolean },
) {
  const bundleDir = path.join(tmpDir, 'bundle')
  let baseApkPath = path.join(bundleDir, 'base.apk')

  return new Listr(
    [
      {
        title: 'Extracting APKs',
        task: () => unzip(inputPath, bundleDir),
      },
      ...(isXapk ? [{
        title: 'Finding base APK path',
        task: async () => {
          const manifestPath = path.join(bundleDir, 'manifest.json')
          const manifestContent = await fs.readFile(manifestPath, 'utf-8')
          const manifest = JSON.parse(manifestContent)

          baseApkPath = path.join(bundleDir, getXapkBaseName(manifest))
        },
      }] : []),
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
        task: () => zip(bundleDir, outputPath),
      },
    ],
  )
}

function getXapkBaseName(manifest: any) {
  if (manifest.split_apks) {
    return manifest.split_apks
      .filter((apk: any) => apk.id === 'base')[0].file
  }

  return `${manifest.package_name}.apk`
}
