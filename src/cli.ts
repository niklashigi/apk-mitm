import * as path from 'path'
import * as fs from './utils/fs'
import parseArgs = require('yargs-parser')
import chalk = require('chalk')
import Listr = require('listr')
import tempy = require('tempy')

import patchApk, { showAppBundleWarning } from './patch-apk'
import { patchXapkBundle, patchApksBundle } from './patch-app-bundle'

import Apktool from './tools/apktool'
import UberApkSigner from './tools/uber-apk-signer'
import Tool from './tools/tool'
import UserError from './utils/user-error'

export type TaskOptions = {
  inputPath: string
  outputPath: string
  skipPatches: boolean
  certificatePath?: string
  mapsApiKey?: string
  apktool: Apktool
  uberApkSigner: UberApkSigner
  tmpDir: string
  wait: boolean
  isAppBundle: boolean
  debuggable: boolean
  skipDecode: boolean
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
    string: ['apktool', 'certificate', 'tmp-dir', 'maps-api-key'],
    boolean: [
      'help',
      'skip-patches',
      'wait',
      'debuggable',
      'keep-tmp-dir',
      'aapt2',
    ],
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

  const { taskFunction, skipDecode, isAppBundle, outputName } =
    await determineTask(inputPath)
  const outputPath = path.resolve(path.dirname(inputPath), outputName)

  // Initialize and validate certificate path
  let certificatePath: string | undefined
  const mapsApiKey: string | undefined = args['maps-api-key']
  if (args.certificate) {
    certificatePath = path.resolve(process.cwd(), args.certificate)
    let certificateExtension = path.extname(certificatePath)

    if (certificateExtension !== '.pem' && certificateExtension !== '.der')
      showSupportedCertificateExtensions()
  }

  let tmpDir = args['tmp-dir']
    ? path.resolve(process.cwd(), args['tmp-dir'])
    : tempy.directory({ prefix: 'apk-mitm-' })
  await fs.mkdir(tmpDir, { recursive: true })
  process.chdir(tmpDir)

  let apktool

  if (args.aapt2 == true) {
    console.log(chalk.dim(`Using AAPT2...\n`))
    apktool = new Apktool({
      frameworkPath: path.join(tmpDir, 'framework'),
      customPath: args.apktool,
      aapt2: true,
    })
  } else {
    console.log(chalk.dim(`Using AAPT...\n`))
    apktool = new Apktool({
      frameworkPath: path.join(tmpDir, 'framework'),
      customPath: args.apktool,
      aapt2: false,
    })
  }
  const uberApkSigner = new UberApkSigner()

  showVersions({ apktool, uberApkSigner })
  if (skipDecode) {
    console.log(
      chalk.dim(`  Patching from decoded apktool directory:\n  ${inputPath}\n`),
    )
  } else {
    console.log(chalk.dim(`  Using temporary directory:\n  ${tmpDir}\n`))
  }

  taskFunction({
    inputPath,
    outputPath,
    certificatePath,
    mapsApiKey,
    tmpDir,
    apktool,
    uberApkSigner,
    wait: args.wait,
    skipPatches: args.skipPatches,
    isAppBundle,
    debuggable: args.debuggable,
    skipDecode,
  })
    .run()
    .then(async context => {
      if (taskFunction === patchApk && context.usesAppBundle) {
        showAppBundleWarning()
      }

      console.log(
        chalk`\n  {green.inverse  Done! } Patched file: {bold ./${outputName}}\n`,
      )

      if (!args['keep-tmp-dir']) {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true })
        } catch (error: any) {
          // No idea why Windows gives us an `EBUSY: resource busy or locked`
          // error here, but deleting the temporary directory isn't the most
          // important thing in the world, so let's just ignore it
          const ignoreError =
            process.platform === 'win32' && error.code === 'EBUSY'

          if (!ignoreError) throw error
        }
      }
    })
    .catch((error: PatchingError) => {
      const message = getErrorMessage(error, { tmpDir })

      console.error(
        [
          '',
          chalk`  {red.inverse.bold  Failed! } An error occurred:`,
          '',
          message,
          '',
          `  The full logs of all commands are available here:`,
          `  ${path.join(tmpDir, 'logs')}`,
          '',
        ].join('\n'),
      )
      if (process.arch.startsWith('arm')) showArmWarning()

      process.exit(1)
    })
}

/**
 * Determines the correct "task" (e.g. "patch APK" or "patch XAPK") depending on
 * the input path's type (file or directory) and extension (e.g. ".apk").
 */
async function determineTask(inputPath: string) {
  const fileStats = await fs.stat(inputPath)

  let outputFileExtension = '.apk'

  let skipDecode = false
  let isAppBundle = false
  let taskFunction: (options: TaskOptions) => Listr

  if (fileStats.isDirectory()) {
    taskFunction = patchApk
    skipDecode = true

    const apktoolYamlPath = path.join(inputPath, 'apktool.yml')
    if (!(await fs.exists(apktoolYamlPath))) {
      throw new UserError(
        'No "apktool.yml" file found inside the input directory!' +
          ' Make sure to specify a directory created by "apktool decode".',
      )
    }
  } else {
    const inputFileExtension = path.extname(inputPath)

    switch (inputFileExtension) {
      case '.apk':
        taskFunction = patchApk
        break
      case '.xapk':
        isAppBundle = true
        taskFunction = patchXapkBundle
        break
      case '.apks':
      case '.zip':
        isAppBundle = true
        taskFunction = patchApksBundle
        break
      default:
        showSupportedExtensions()
    }

    outputFileExtension = inputFileExtension
  }

  const baseName = path.basename(inputPath, outputFileExtension)
  const outputName = `${baseName}-patched${outputFileExtension}`

  return { skipDecode, taskFunction, isAppBundle, outputName }
}

function getErrorMessage(error: PatchingError, { tmpDir }: { tmpDir: string }) {
  // User errors can be shown without a stack trace
  if (error instanceof UserError) return error.message

  // Errors from commands can also be shown without a stack trace
  if (error.all) return formatCommandError(error.all, { tmpDir })

  return error.stack
}

function formatCommandError(error: string, { tmpDir }: { tmpDir: string }) {
  return (
    error
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
  )
}

function showHelp() {
  console.log(chalk`
  $ {bold apk-mitm} <path-to-apk/xapk/apks/decoded-directory>

  {blue {dim.bold *} Optional flags:}
  {dim {bold --wait} Wait for manual changes before re-encoding}
  {dim {bold --tmp-dir <path>} Where temporary files will be stored}
  {dim {bold --keep-tmp-dir} Don't delete the temporary directory after patching}
  {dim {bold --debuggable} Make the patched app debuggable}
  {dim {bold --skip-patches} Don't apply any patches (for troubleshooting)}
  {dim {bold --apktool <path-to-jar>} Use custom version of Apktool}
  {dim {bold --certificate <path-to-pem/der>} Add specific certificate to network security config}
  {dim {bold --maps-api-key <api-key>} Add custom Google Maps API key to be replaced while patching apk}
  `)
}

/**
 * Error that is shown when the file provided through the positional argument
 * has an unsupported extension. Exits with status 1 after showing the message.
 */
function showSupportedExtensions(): never {
  console.log(chalk`{yellow
  It looks like you tried running {bold apk-mitm} with an unsupported file type!

  Only the following file extensions are supported: {bold .apk}, {bold .xapk}, and {bold .apks} (or {bold .zip})
  }`)

  process.exit(1)
}

/**
 * Error that is shown when the file provided through the `--certificate` flag
 * has an unsupported extension. Exits with status 1 after showing the message.
 */
function showSupportedCertificateExtensions(): never {
  console.log(chalk`{yellow
  It looks like the certificate file you provided is unsupported!

  Only {bold .pem} and {bold .der} certificate files are supported.
  }`)

  process.exit(1)
}

function showVersions({
  apktool,
  uberApkSigner,
}: {
  apktool: Tool
  uberApkSigner: Tool
}) {
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
