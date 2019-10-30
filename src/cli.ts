import path from 'path'
import parseArgs from 'yargs-parser'
import chalk from 'chalk'
import Listr from 'listr'
import tempy from 'tempy'

const { version } = require('../package.json')
import { prepareApk, prepareAppBundle, TaskOptions } from '.'

import Apktool from './tools/apktool'
import uberApkSigner from './tools/uber-apk-signer'

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    string: ['apktool']
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
      taskFunction = prepareApk
      break
    case '.xapk':
      taskFunction = prepareAppBundle
      break
    case '.apks':
      taskFunction = prepareAppBundle
      break
    default:
      showSupportedExtensions()
  }

  const apktool = new Apktool(args.apktool)
  showVersions({ apktool })

  const tmpDir = tempy.directory()
  console.log(chalk.dim(`  Using temporary directory:\n  ${tmpDir}\n`))

  taskFunction({ inputPath, outputPath, tmpDir, apktool }).run().then(() => {
    console.log(
      chalk`\n  {green.inverse  Done! } Patched file: {bold ./${outputName}}\n`,
    )
  }).catch((error: Error) => {
    console.error(
      chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
      error.toString()
    )

    process.exit(1)
  })
}

function showHelp() {
  console.log(chalk`
  $ {bold apk-mitm} <path-to-apk/xapk/apks>
      {dim {bold --apktool} Path to custom Apktool.jar {gray.italic (optional)}}
  `)
}

function showSupportedExtensions() {
  console.log(chalk`
  It looks like you tried running {bold apk-mitm} with an unsupported file
    {bold apk-mitm} only supports : {yellow .apk}, {yellow .xapk} and {yellow .apks}
  `)

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
