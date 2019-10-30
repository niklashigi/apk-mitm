import * as path from 'path'
import * as fs from './utils/fs'

import Listr from 'listr'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import globby from 'globby'

import modifyManifest from './tasks/modify-manifest'
import modifyNetworkSecurityConfig from './tasks/modify-netsec-config'
import disableCertificatePinning from './tasks/disable-certificate-pinning'

import uberApkSigner from './tools/uber-apk-signer'
import Apktool from './tools/apktool'
import compression from './tools/compression'
import { executeBin } from './utils/execute'

export type TaskOptions = {
  inputPath: string,
  outputPath: string,
  apktool: Apktool,
  tmpDir: string,
}

export function prepareApk({ inputPath, outputPath, tmpDir, apktool }: TaskOptions) {
  const decodeDir = path.join(tmpDir, 'decode')
  const tmpApkPath = path.join(tmpDir, 'tmp.apk')

  let fallBackToAapt = false
  let nscName: string

  return new Listr([
    {
      title: 'Decoding APK file',
      task: () => apktool.decode(inputPath, decodeDir)
    },
    {
      title: 'Modifying app manifest',
      task: async () => {
        const result = await modifyManifest(
          path.join(decodeDir, 'AndroidManifest.xml')
        )
        nscName = result.nscName
      }
    },
    {
      title: 'Modifying network security config',
      task: () =>
        modifyNetworkSecurityConfig(
          path.join(decodeDir, `res/xml/${nscName}.xml`)
        )
    },
    {
      title: 'Disabling certificate pinning',
      task: (_, task) => disableCertificatePinning(decodeDir, task)
    },
    {
      title: 'Encoding patched APK file',
      task: () =>
        new Listr([
          {
            title: 'Encoding using AAPT2',
            task: (_, task) =>
              new Observable(subscriber => {
                apktool.encode(decodeDir, tmpApkPath, true).subscribe(
                  line => subscriber.next(line),
                  () => {
                    subscriber.complete()
                    task.skip('Failed, falling back to AAPT...')
                    fallBackToAapt = true
                  },
                  () => subscriber.complete()
                )
              })
          },
          {
            title: chalk`Encoding using AAPT {dim [fallback]}`,
            skip: () => !fallBackToAapt,
            task: () => apktool.encode(decodeDir, tmpApkPath, false)
          }
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
      })
    }
  ])
}

export function prepareAppBundle({ inputPath, outputPath, tmpDir, apktool }: TaskOptions) {
  const bundleDir = path.join(tmpDir, 'bundle')
  const baseApkPath = path.join(bundleDir, 'base.apk')

  return new Listr(
    [
      {
        title: 'Extracting APKs',
        task: () => compression.unzip(inputPath, bundleDir)
      },
      {
        title: 'Patching base APK',
        task: () => prepareApk({
          inputPath: baseApkPath, outputPath: baseApkPath,
          tmpDir: path.join(tmpDir, 'base-apk'), apktool,
        })
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
        })
      },
      {
        title: 'Compressing APKs',
        task: async () => {
          const bundleFiles = await globby(path.join(bundleDir, '**/*.apk'))
          return compression.zip(outputPath, bundleFiles)
        }
      }
    ],
  )
}
