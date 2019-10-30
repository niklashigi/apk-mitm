import chalk from 'chalk'
import parseArgs from 'yargs-parser'
import path from 'path'

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

  switch (fileExtension) {
    case '.apk':
      prepareApk(inputPath, { apktoolPath: args.apktool }).run()
        .then(handleSuccess(outputName)).catch(handleError)
      break
    case '.xapk':
      prepareAppBundle(inputPath, { apktoolPath: args.apktool }).run()
        .then(handleSuccess(outputName)).catch(handleError)
      break
    case '.apks':
      prepareAppBundle(inputPath, { apktoolPath: args.apktool }).run()
        .then(handleSuccess(outputName)).catch(handleError)
      break
    default:
      showSupportedExtensions()
  }
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
}

function handleSuccess(fileName: string) {
  return () => console.log(
    chalk`\n  {green.inverse  Done! } Patched APK: {bold ./${fileName}}\n`,
  )
}

function handleError(error: any) {
  console.error(
    chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
    error.toString()
  )

  process.exit(1)
}

main()
