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
import keytool from './tools/keytool'
import { executeBin } from './utils/execute'

export type TaskOptions = {
  inputPath: string,
  outputPath: string,
  apktool: Apktool,
  tmpDir: string,
}

export function prepareApk({ inputPath, outputPath, tmpDir, apktool }: TaskOptions) {
  const decodeDir = path.join(tmpDir, 'decode')
  const unsignedApkPath = path.join(tmpDir, 'unsigned.apk')

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
                apktool.encode(decodeDir, unsignedApkPath, true).subscribe(
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
            task: () => apktool.encode(decodeDir, unsignedApkPath, false)
          }
        ])
    },
    {
      title: 'Signing patched APK file',
      task: () =>
        new Observable(subscriber => {
          (async () => {
            await uberApkSigner
              .sign(unsignedApkPath)
              .forEach(line => subscriber.next(line))

            await fs.copyFile(
              path.join(tmpDir, 'unsigned-aligned-debugSigned.apk'),
              outputPath,
            )

            subscriber.complete()
          })()
        })
    }
  ])
}

export function prepareAppBundle({ inputPath, outputPath, tmpDir, apktool }: TaskOptions) {
  const apksDir = path.join(tmpDir, 'apks')

  const baseApkPath = path.join(apksDir, 'base.apk')

  console.log(chalk.dim(`  Using temporary directory:\n  ${tmpDir}\n`))

  return new Listr(
    [
      {
        title: 'Unzipping App Bundle',
        task: () => compression.unzip(inputPath, apksDir)
      },
      {
        title: 'Generating a new signing key',
        task: () => keytool.createCertificate()
      },
      {
        title: 'Doing some magic over base.apk',
        task: () => prepareApk({
          inputPath: baseApkPath, outputPath: baseApkPath,
          tmpDir: path.join(tmpDir, 'base-apk'), apktool,
        })
      },
      {
        title: 'Signing APK file',
        task: () => new Observable(subscriber => {
          async () => {
            const apkFiles = await globby(path.join(apksDir, '**/*.apk'))

            for (const filePath of apkFiles) {
              await executeBin('apksigner', [
                'sign',
                '--ks debug.keystore',
                '--ks-pass pass:android',
                filePath,
              ])
            }

            subscriber.complete()
          }
        }),
      },
      {
        title: 'Zipping all the apk files',
        task: async () => {
          const apkFiles = await globby(path.join(apksDir, '**/*.apk'))
          return compression.zip(outputPath, apkFiles)
        }
      }
    ],
  )
}
