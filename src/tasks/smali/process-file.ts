import * as os from 'os'
import * as fs from '../../utils/fs'
import escapeStringRegexp = require('escape-string-regexp')
import chalk = require('chalk')

import parseSmaliHead, { SmaliHead } from './parse-head'
import smaliPatches from './patches'
import { SmaliPatch } from './types'

/**
 * Process the given Smali file and apply applicable patches.
 * @returns whether patches were applied
 */
export default async function processSmaliFile(
  filePath: string,
  log: (message: string) => void,
): Promise<boolean> {
  let originalContent = await fs.readFile(filePath, 'utf-8')

  if (os.type() === 'Windows_NT') {
    // Replace CRLF with LF, so that patches can just use '\n'
    originalContent = originalContent.replace(/\r\n/g, '\n')
  }

  let patchedContent = originalContent

  const smaliHead = parseSmaliHead(patchedContent)
  if (smaliHead.isInterface) return false

  const applicablePatches = smaliPatches.filter(patch =>
    selectorMatchesClass(patch, smaliHead),
  )
  if (applicablePatches.length === 0) return false

  const applicableMethods = applicablePatches.flatMap(patch => patch.methods)
  for (const method of applicableMethods) {
    const pattern = createMethodPattern(method.signature)
    patchedContent = patchedContent.replace(
      pattern,
      (_, openingLine: string, body: string, closingLine: string) => {
        const bodyLines = body
          .split('\n')
          .map(line => line.replace(/^    /, ''))

        const patchedBodyLines = [
          '# inserted by apk-mitm to disable certificate pinning',
          ...method.replacementLines,
          '',
          '# commented out by apk-mitm to disable old method body',
          '# ',
          ...bodyLines.map(line => `# ${line}`),
        ]

        log(
          chalk`{bold ${smaliHead.name}}{dim :} Applied {bold ${method.name}} patch`,
        )

        return [
          openingLine,
          ...patchedBodyLines.map(line => `    ${line}`),
          closingLine,
        ]
          .map(line => line.trimEnd())
          .join('\n')
      },
    )
  }

  if (originalContent !== patchedContent) {
    if (os.type() === 'Windows_NT') {
      // Replace LF with CRLF again
      patchedContent = patchedContent.replace(/\n/g, '\r\n')
    }

    await fs.writeFile(filePath, patchedContent)
    return true
  }

  return false
}

/**
 * Creates a full RegExp pattern for finding a method based on its signature.
 */
function createMethodPattern(signature: string): RegExp {
  const escapedSignature = escapeStringRegexp(signature)
  return new RegExp(
    `(\\.method public (?:final )?${escapedSignature})\\n([^]+?)\\n(\\.end method)`,
    'g',
  )
}

/**
 * Checks whether the given patch can be applied to the given
 * class based on its name and the interfaces it implements.
 */
function selectorMatchesClass(
  patch: SmaliPatch,
  smaliHead: SmaliHead,
): boolean {
  return (
    /* The class matches */
    (patch.selector.type === 'class' &&
      patch.selector.name === smaliHead.name) ||
    /* One of the implemented interfaces matches */
    (patch.selector.type === 'interface' &&
      smaliHead.implements.includes(patch.selector.name))
  )
}
