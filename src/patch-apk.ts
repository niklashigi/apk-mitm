import * as path from 'path'
import { once } from 'events'
import * as fs from './utils/fs'
import Listr = require('listr')
import chalk = require('chalk')

import { TaskOptions } from './cli'
import downloadTools from './tasks/download-tools'
import observeAsync from './utils/observe-async'
import applyPatches from './tasks/apply-patches'

export default function patchApk(options: TaskOptions) {
  const { apktool, uberApkSigner } = options

  const decodeDir = path.join(options.tmpDir, 'decode')
  const tmpApkPath = path.join(options.tmpDir, 'tmp.apk')

  let fallBackToAapt = false

  return new Listr([
    {
      title: 'Downloading tools',
      task: () => downloadTools(options),
    },
    {
      title: 'Decoding APK file',
      task: () => apktool.decode(options.inputPath, decodeDir),
    },
    {
      title: 'Applying patches',
      skip: () => options.skipPatches,
      task: () => applyPatches(decodeDir, options.debuggable),
    },
    {
      title: 'Waiting for you to make changes',
      enabled: () => options.wait,
      task: () =>
        observeAsync(async log => {
          process.stdin.setEncoding('utf-8')
          process.stdin.setRawMode(true)

          log('Press any key to continue.')
          await once(process.stdin, 'data')

          process.stdin.setRawMode(false)
          process.stdin.pause()
        }),
    },
    {
      title: 'Encoding patched APK file',
      task: () =>
        new Listr([
          {
            title: 'Encoding using AAPT2',
            task: (_, task) =>
              observeAsync(async next => {
                try {
                  await apktool
                    .encode(decodeDir, tmpApkPath, true)
                    .forEach(next)
                } catch {
                  task.skip('Failed, falling back to AAPT...')
                  fallBackToAapt = true
                }
              }),
          },
          {
            title: chalk`Encoding using AAPT {dim [fallback]}`,
            skip: () => !fallBackToAapt,
            task: () => apktool.encode(decodeDir, tmpApkPath, false),
          },
        ]),
    },
    {
      title: 'Signing patched APK file',
      task: () =>
        observeAsync(async log => {
          await uberApkSigner
            .sign([tmpApkPath], { zipalign: true })
            .forEach(line => log(line))

          await fs.copyFile(tmpApkPath, options.outputPath)
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
