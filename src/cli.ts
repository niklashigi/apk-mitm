import chalk from 'chalk'
import parseArgs from 'yargs-parser'

import prepareApk from '.'

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    string: ['apktool'],
  })

  if (args.help) {
    showHelp()
    process.exit()
  }

  const [apkPath] = args._
  if (!apkPath) {
    showHelp()
    process.exit(1)
  }

  prepareApk(apkPath, { apktoolPath: args.apktool })
}

function showHelp() {
  console.log(chalk`
  $ {bold apk-mitm} <path-to-apk>
      {dim {bold --apktool} Path to custom Apktool.jar {gray.italic (optional)}}
    `)
}

main()
