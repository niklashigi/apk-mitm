import * as path from 'path'
import * as fs from '../utils/fs'

import globby from 'globby'
import escapeStringRegexp from 'escape-string-regexp'
import { Observable } from 'rxjs'
import { ListrTaskWrapper } from 'listr'

/** The methods that need to be patched to disable certificate pinning. */
const METHOD_SIGNATURES = [
  'checkClientTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
  'checkServerTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
  'getAcceptedIssuers()[Ljava/security/cert/X509Certificate;',
]

/** Patterns used to find the methods defined in `METHOD_SIGNATURES`. */
const METHOD_PATTERNS = METHOD_SIGNATURES.map(signature => {
  const escapedSignature = escapeStringRegexp(signature)
  return new RegExp(
    `(\\.method public (?:final )?${escapedSignature})\\n([^]+?)\\n(\\.end method)`,
    'g',
  )
})

/** Code inserted into `checkClientTrusted` and `checkServerTrusted`. */
const RETURN_VOID_FIX = [
  '.locals 0',
  'return-void',
]

/** Code inserted into `getAcceptedIssuers`. */
const RETURN_EMPTY_ARRAY_FIX = [
  '.locals 1',
  'const/4 v0, 0x0',
  'new-array v0, v0, [Ljava/security/cert/X509Certificate;',
  'return-object v0',
]

export default async function disableCertificatePinning(directoryPath: string, task: ListrTaskWrapper) {
  return new Observable(observer => {
    (async () => {
      observer.next('Finding smali files...')
      const smaliFiles = await globby(path.join(directoryPath, 'smali*/**/*.smali'))

      let pinningFound = false

      for (const filePath of smaliFiles) {
        observer.next(`Scanning ${path.basename(filePath)}...`)

        const originalContent = await fs.readFile(filePath, 'utf-8')
        let patchedContent = originalContent

        for (const pattern of METHOD_PATTERNS) {
          patchedContent = patchedContent.replace(
            pattern, (
              _,
              openingLine: string,
              body: string,
              closingLine: string,
            ) => {
              const bodyLines = body
                .split('\n')
                .map(line => line.replace(/^    /, ''))

              const fixLines = openingLine.includes('getAcceptedIssuers')
                ? RETURN_EMPTY_ARRAY_FIX
                : RETURN_VOID_FIX

              const patchedBodyLines = [
                '# inserted by apk-mitm to disable certificate pinning',
                ...fixLines,
                '',
                '# commented out by apk-mitm to disable old method body',
                '# ',
                ...bodyLines.map(line => `# ${line}`)
              ]

              return [
                openingLine,
                ...patchedBodyLines.map(line => `    ${line}`),
                closingLine,
              ].map(line => line.trimEnd()).join('\n')
            },
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
