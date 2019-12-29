import path from 'path'
import parseArgs from 'yargs-parser'
import chalk from 'chalk'
import Listr from 'listr'
import tempy from 'tempy'

import patchApk, { showAppBundleWarning } from './patch-apk'
import { patchXapkBundle, patchApksBundle } from './patch-app-bundle'

import Apktool from './tools/apktool'
import uberApkSigner from './tools/uber-apk-signer'

export type TaskOptions = {
  inputPath: string,
  outputPath: string,
  apktool: Apktool,
  tmpDir: string,
  wait: boolean,
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

  const apktool = new Apktool(args.apktool)
  showVersions({ apktool })

  const tmpDir = tempy.directory()
  console.log(chalk.dim(`  Using temporary directory:\n  ${tmpDir}\n`))

  taskFunction({ inputPath, outputPath, tmpDir, apktool, wait: args.wait }).run().then(context => {
    if (taskFunction === patchApk && context.usesAppBundle) {
      showAppBundleWarning()
    }

    console.log(
      chalk`\n  {green.inverse  Done! } Patched file: {bold ./${outputName}}\n`,
    )
  }).catch((error: any) => {
    console.error(
      chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
      error.toString()
    )

    if (error.stderr) console.error('\n', error.stderr)

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

function showVersions({ apktool }: { apktool: Apktool }) {
  console.log(chalk`
  {dim ╭} {blue {bold apk-mitm} v${version}}
  {dim ├ {bold apktool} ${apktool.version}
  ╰ {bold uber-apk-signer} ${uberApkSigner.version}}
  `)
}

main()
