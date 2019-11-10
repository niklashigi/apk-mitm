import * as path from 'path'
import * as fs from '../utils/fs'

import globby from 'globby'
import replaceAll from 'replace-string'
import { Observable } from 'rxjs'
import { ListrTaskWrapper } from 'listr'

const methodSignatures = [
  '.method public checkClientTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
  '.method public final checkClientTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
  '.method public checkServerTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
  '.method public final checkServerTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
  '.method public getAcceptedIssuers()[Ljava/security/cert/X509Certificate;',
  '.method public final getAcceptedIssuers()[Ljava/security/cert/X509Certificate;',
]

export default async function disableCertificatePinning(directoryPath: string, task: ListrTaskWrapper) {
  return new Observable(observer => {
    (async () => {
      observer.next('Finding smali files...')
      const smaliFiles = await globby(path.join(directoryPath, '**/*.smali'))

      let pinningFound = false

      for (const filePath of smaliFiles) {
        observer.next(`Scanning ${path.basename(filePath)}...`)

        const originalContent = await fs.readFile(filePath, 'utf-8')
        let patchedContent = originalContent

        for (const signature of methodSignatures) {
          patchedContent = replaceAll(
            patchedContent,
            signature,
            `${signature}\n    return-void`,
          )
        }

        if (originalContent !== patchedContent) {
          pinningFound = true
          await fs.writeFile(filePath, patchedContent)
        }
      }

      if (!pinningFound) task.skip('No certificate pinning logic found.')
      observer.complete()
    })()
  })
}
