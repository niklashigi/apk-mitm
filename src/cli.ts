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

  const [filePath] = args._;
  if (!filePath) {
    showHelp();
    process.exit(1);
  }
  const fileExtension: string = path.extname(filePath);
  switch(fileExtension) {
    case 'apk':
      prepareApk(filePath, { apktoolPath: args.apktool });
      break;
    case 'xapk':
      prepareAppBundle(filePath, { apktoolPath: args.apktool });
      break;
    case 'apks':
      prepareAppBundle(filePath, { apktoolPath: args.apktool });
      break;
    default:
      showSupportedExtensions()
      break;
  }
}

function showHelp() {
  console.log(chalk`
  $ {bold apk-mitm} <path-to-apk/xapk/apks>
      {dim {bold --apktool} Path to custom Apktool.jar {gray.italic (optional)}}
    `);
}

function showSupportedExtensions() {
  console.log(chalk`
  It looks like you tried running {bold apk-mitm} with an unsupported file
    {bold apk-mitm} only supports : {yellow .apk}, {yellow .xapk} and {yellow .apks} 
    `);
}

main();
