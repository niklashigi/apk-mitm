import { unzip, zip } from '@tybys/cross-zip'
import * as fs from './utils/fs'
import * as path from 'path'
import globby = require('globby')
import Listr = require('listr')

import patchApk from './patch-apk'
import { TaskOptions } from './cli'
import observeAsync from './utils/observe-async'
import buildGlob from './utils/build-glob'

export function patchXapkBundle(options: TaskOptions) {
  return patchAppBundle(options, { isXapk: true })
}

export function patchApksBundle(options: TaskOptions) {
  return patchAppBundle(options, { isXapk: false })
}

function patchAppBundle(options: TaskOptions, { isXapk }: { isXapk: boolean }) {
  const { inputPath, outputPath, tmpDir, uberApkSigner } = options

  const bundleDir = path.join(tmpDir, 'bundle')
  let baseApkPath = path.join(bundleDir, 'base.apk')

  return new Listr([
    {
      title: 'Extracting APKs',
      task: () => unzip(inputPath, bundleDir),
    },
    ...(isXapk
      ? [
          {
            title: 'Finding base APK path',
            task: async () => {
              const manifestPath = path.join(bundleDir, 'manifest.json')
              const manifestContent = await fs.readFile(manifestPath, 'utf-8')
              const manifest = JSON.parse(manifestContent)

              baseApkPath = path.join(bundleDir, getXapkBaseName(manifest))
            },
          },
        ]
      : []),
    {
      title: 'Patching base APK',
      task: () =>
        patchApk({
          ...options,
          inputPath: baseApkPath,
          outputPath: baseApkPath,
          tmpDir: path.join(tmpDir, 'base-apk'),
        }),
    },
    {
      title: 'Signing APKs',
      task: () =>
        observeAsync(async log => {
          const apkFiles = await globby(buildGlob(bundleDir, '**/*.apk'))

          await uberApkSigner
            .sign(apkFiles, { zipalign: false })
            .forEach(line => log(line))
        }),
    },
    {
      title: 'Compressing APKs',
      task: () => zip(bundleDir, outputPath),
    },
  ])
}

function getXapkBaseName(manifest: any) {
  if (manifest.split_apks) {
    return manifest.split_apks.filter((apk: any) => apk.id === 'base')[0].file
  }

  return `${manifest.package_name}.apk`
}
