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

  const [filePath] = args._
  if (!filePath) {
    showHelp()
    process.exit(1)
  }

  const fileExtension = path.extname(filePath)
  const finishedFileName = `${path.basename(
    filePath,
    fileExtension
  )}-patched${fileExtension}`

  switch (fileExtension) {
    case '.apk':
      await prepareApk(filePath, { apktoolPath: args.apktool })
        .run()
        .catch(error => {
          console.error(
            chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
            error.toString()
          )

          process.exit(1)
        })
      break
    case '.xapk':
      await prepareAppBundle(filePath, { apktoolPath: args.apktool })
        .run()
        .then(() => {
          console.log(chalk`
  {green.inverse  Done! } Patched APK: {bold ./${finishedFileName}}
  `)
        })
        .catch(error => {
          console.error(
            chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
            error.toString()
          )

          process.exit(1)
        })
      break
    case '.apks':
      await prepareAppBundle(filePath, { apktoolPath: args.apktool })
        .run()
        .then(() => {
          console.log(chalk`
  {green.inverse  Done! } Patched APK: {bold ./${finishedFileName}}
  `)
        })
        .catch(error => {
          console.error(
            chalk`\n  {red.inverse.bold  Failed! } An error occurred:\n\n`,
            error.toString()
          )

          process.exit(1)
        })
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

main()
