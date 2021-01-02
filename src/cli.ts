import path from 'path'
import parseArgs from 'yargs-parser'
import chalk from 'chalk'
import Listr from 'listr'
import tempy from 'tempy'

import patchApk, { showAppBundleWarning } from './patch-apk'
import { patchXapkBundle, patchApksBundle } from './patch-app-bundle'

import Apktool from './tools/apktool'
import UberApkSigner from './tools/uber-apk-signer'
import Tool from './tools/tool'

export type TaskOptions = {
  inputPath: string,
  outputPath: string,
  apktool: Apktool,
  uberApkSigner: UberApkSigner,
  tmpDir: string,
  wait: boolean,
}

interface PatchingError extends Error {
  /**
   * Interleaved stdout and stderr output on execa errors
   * @see https://github.com/sindresorhus/execa#all-1
   */
  all?: string
}

const { version } = require('../package.json')

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    string: ['apktool'],
    boolean: ['help', 'wait'],
  })

  if (args.help) {
    showHelp()
    process.exit()
  }

  const [input] = args._
  if (!input) {
    showHelp()
    process.exit(1)
  }
  const inputPath = path.resolve(process.cwd(), input)

  const fileExtension = path.extname(input)
  const outputName = `${path.basename(input, fileExtension)}-patched${fileExtension}`
  const outputPath = path.resolve(path.dirname(inputPath), outputName)

  let taskFunction: (options: TaskOptions) => Listr

  switch (fileExtension) {
    case '.apk':
      taskFunction = patchApk
      break
    case '.xapk':
      taskFunction = patchXapkBundle
      break
    case '.apks':
    case '.zip':
      taskFunction = patchApksBundle
      break
    default:
      showSupportedExtensions()
  }

  const tmpDir = tempy.directory({ prefix: 'apk-mitm-' })
  process.chdir(tmpDir)

  const apktool = new Apktool({
    frameworkPath: path.join(tmpDir, 'framework'),
    customPath: args.apktool,
  })
  const uberApkSigner = new UberApkSigner()

  showVersions({ apktool, uberApkSigner })
  console.log(chalk.dim(`  Using temporary directory:\n  ${tmpDir}\n`))

  taskFunction({ inputPath, outputPath, tmpDir, apktool, uberApkSigner, wait: args.wait }).run().then(context => {
    if (taskFunction === patchApk && context.usesAppBundle) {
      showAppBundleWarning()
    }

    console.log(
      chalk`\n  {green.inverse  Done! } Patched file: {bold ./${outputName}}\n`,
    )
  }).catch((error: PatchingError) => {
    const message = (error.all || (error.toString().replace(/^Error: /, '')))
      // Replace mentions of the (sometimes very long) temporary directory path
      .replace(new RegExp(tmpDir, 'g'), chalk`{bold <tmp_dir>}`)
      // Highlight (usually relevant) warning lines in Apktool output
      .replace(/^W: .+$/gm, line => chalk`{yellow ${line}}`)
      // De-emphasize Apktool info lines
      .replace(/^I: .+$/gm, line => chalk`{dim ${line}}`)
      // De-emphasize (not very helpful) Apktool "could not exec" error message
      .replace(
        /^.+brut\.common\.BrutException: could not exec.+$/gm,
        line => chalk`{dim ${line}}`,
      )

    console.error(
      [
        '',
        chalk`  {red.inverse.bold  Failed! } An error occurred:`,
        '',
        message,
        '',
        `  The full logs of all commands are available here:`,
        `  ${path.join(tmpDir, 'logs')}`,
        ''
      ].join('\n'),
    )
    if (process.arch.startsWith('arm')) showArmWarning()

    process.exit(1)
  })
}

function showHelp() {
  console.log(chalk`
  $ {bold apk-mitm} <path-to-apk/xapk/apks>
      {dim {bold --wait} Wait for manual changes before re-encoding {gray.italic (optional)}}
      {dim {bold --apktool} Path to custom Apktool.jar {gray.italic (optional)}}
  `)
}

function showSupportedExtensions() {
  console.log(chalk`{yellow
  It looks like you tried running {bold apk-mitm} with an unsupported file type!

  Only the following file extensions are supported: {bold .apk}, {bold .xapk}, and {bold .apks} (or {bold .zip})
  }`)

  process.exit(1)
}

function showVersions(
  { apktool, uberApkSigner }: { apktool: Tool, uberApkSigner: Tool },
) {
  console.log(chalk`
  {dim ╭} {blue {bold apk-mitm} v${version}}
  {dim ├ {bold apktool} ${apktool.version.name}
  ╰ {bold uber-apk-signer} ${uberApkSigner.version.name}}
  `)
}

export function showArmWarning() {
  console.log(chalk`{yellow
  {inverse.bold  NOTE }

  {bold apk-mitm} doesn't officially support ARM-based devices (like Raspberry Pi's)
  at the moment, so the error above might be a result of that. Please try
  patching this APK on a device with a more common CPU architecture like x64
  before reporting an issue.
  }`)
}

main()
