import path from 'path'
import parseArgs from 'yargs-parser'
import chalk from 'chalk'
import Listr from 'listr'

import { prepareApk, prepareAppBundle } from '.'

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    string: ['apktool']
  })

  if (args.help) {
    showHelp()
    process.exit()
  }

  const [inputPath] = args._
  if (!inputPath) {
    showHelp()
    process.exit(1)
  }

  const fileExtension = path.extname(inputPath)
  const outputName = `${path.basename(
    inputPath,
    fileExtension
  )}-patched${fileExtension}`

  let taskFunction: (inputPath: string, options: any) => Listr

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

  taskFunction(inputPath, { apktoolPath: args.apktool }).run().then(() => {
    chalk`\n  {green.inverse  Done! } Patched APK: {bold ./${outputName}}\n`
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

main()
