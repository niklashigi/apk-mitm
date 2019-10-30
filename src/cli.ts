import chalk from "chalk";
import parseArgs from "yargs-parser";
import path from "path";

import { prepareApk, prepareAppBundle } from ".";

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    string: ["apktool"]
  });

  if (args.help) {
    showHelp();
    process.exit();
  }

  const [apkPath] = args._;
  if (!apkPath) {
    showHelp();
    process.exit(1);
  }
  const fileExtension: string = path.extname(apkPath);
  switch(fileExtension) {
    case 'apk':
      prepareApk(apkPath, { apktoolPath: args.apktool });
      break;
    case 'xapk':
      prepareAppBundle(apkPath, { apktoolPath: args.apktool });
      break;
    case 'apks':
      prepareAppBundle(apkPath, { apktoolPath: args.apktool });
      break;
    default:
      break;
  }
}

function showHelp() {
  console.log(chalk`
  $ {bold apk-mitm} <path-to-apk>
      {dim {bold --apktool} Path to custom Apktool.jar {gray.italic (optional)}}
    `);
}

main();
