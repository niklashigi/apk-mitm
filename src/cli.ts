import prepareApk from '.'

async function main() {
  const [apkPath] = process.argv.slice(2)

  if (!apkPath) {
    console.error('You need to pass in the path of an APK file!')
    process.exit(1)
  }

  prepareApk(apkPath)
}

main()
