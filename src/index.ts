import * as path from "path";
import * as fs from "./utils/fs";

import Listr from "listr";
import tempy from "tempy";
import chalk from "chalk";
import { Observable } from "rxjs";
import globby from "globby";

const { version } = require("../package.json");

import modifyManifest from "./tasks/modify-manifest";
import modifyNetworkSecurityConfig from "./tasks/modify-netsec-config";
import disableCertificatePinning from "./tasks/disable-certificate-pinning";

import uberApkSigner from "./tools/uber-apk-signer";
import Apktool from "./tools/apktool";
import compression from "./tools/compression";
import keytool from "./tools/keytool";
import { executeBin } from "./utils/execute";

type Options = {
  apktoolPath?: string;
};

const TMP_DIR = tempy.directory();

const DECODE_DIR = path.join(TMP_DIR, "decode");
const UNSIGNED_APK_PATH = path.join(TMP_DIR, "unsigned.apk");

export function prepareApk(apkPath: string, options: Options) {
  const apktool = new Apktool(options.apktoolPath);
  const finishedApkName = `${path.basename(apkPath, ".apk")}-patched.apk`;
  const finishedApkPath = path.join(path.dirname(apkPath), finishedApkName);
  let fallBackToAapt = false;
  let nscName: string;

  apkPath = path.resolve(process.cwd(), apkPath);

  console.log(chalk`
  {dim ╭} {blue {bold apk-mitm} v${version}}
  {dim ├ {bold apktool} ${apktool.version}
  ╰ {bold uber-apk-signer} ${uberApkSigner.version}}
  `);

  console.log(chalk.dim(`  Using temporary directory:\n  ${TMP_DIR}\n`));

  return new Listr([
    {
      title: "Decoding APK file",
      task: () => apktool.decode(apkPath, DECODE_DIR)
    },
    {
      title: "Modifying app manifest",
      task: async () => {
        const result = await modifyManifest(
          path.join(DECODE_DIR, "AndroidManifest.xml")
        );
        nscName = result.nscName;
      }
    },
    {
      title: "Modifying network security config",
      task: () =>
        modifyNetworkSecurityConfig(
          path.join(DECODE_DIR, `res/xml/${nscName}.xml`)
        )
    },
    {
      title: "Disabling certificate pinning",
      task: (_, task) => disableCertificatePinning(DECODE_DIR, task)
    },
    {
      title: "Encoding patched APK file",
      task: () =>
        new Listr([
          {
            title: "Encoding using AAPT2",
            task: (_, task) =>
              new Observable(subscriber => {
                apktool.encode(DECODE_DIR, UNSIGNED_APK_PATH, true).subscribe(
                  line => subscriber.next(line),
                  () => {
                    subscriber.complete();
                    task.skip("Failed, falling back to AAPT...");
                    fallBackToAapt = true;
                  },
                  () => subscriber.complete()
                );
              })
          },
          {
            title: chalk`Encoding using AAPT {dim [fallback]}`,
            skip: () => !fallBackToAapt,
            task: () => apktool.encode(DECODE_DIR, UNSIGNED_APK_PATH, false)
          }
        ])
    },
    {
      title: "Signing patched APK file",
      task: () =>
        new Observable(subscriber => {
          (async () => {
            await uberApkSigner
              .sign(UNSIGNED_APK_PATH)
              .forEach(line => subscriber.next(line));

            await fs.copyFile(
              path.join(TMP_DIR, "unsigned-aligned-debugSigned.apk"),
              finishedApkPath
            );

            subscriber.complete();
          })();
        })
    }
  ]);
}

export function prepareAppBundle(apkPath: string, options: Options) {
  const apktool = new Apktool(options.apktoolPath);
  apkPath = path.resolve(process.cwd(), apkPath);

  console.log(
    chalk`{yellow
  {inverse.bold  WARNING }

  This app seems to be using {bold Android App Bundle} which is dependent on Google Play.
  This feature is very {bold experimental} as a result {bold it might not work} 
  }`
  );

  console.log(chalk`
    {dim ╭} {blue {bold apk-mitm} v${version}}
    {dim ├ {bold apktool} ${apktool.version}
    ╰ {bold uber-apk-signer} ${uberApkSigner.version}}
    `);

  console.log(chalk.dim(`  Using temporary directory:\n  ${TMP_DIR}\n`));

  return new Listr(
    [
      {
        title: "Unzipping App Bundle",
        task: () => compression.unzip(apkPath, DECODE_DIR)
      },
      {
        title: "Generating a new signing key",
        task: () => keytool.createCertificate()
      },
      {
        title: "Doing some magic over base.apk",
        task: () => prepareApk(apkPath, options)
      },
      {
        title: "Replacing patched base.apk",
        task: async () => {
          const baseApkFile: string = path.join(DECODE_DIR, "base.apk");
          const basePatchedApkFile: string = path.join(
            DECODE_DIR,
            "base-patched.apk"
          );
          await fs.unlink(baseApkFile);
          await fs.rename(basePatchedApkFile, baseApkFile);
        }
      },
      {
        title: "Signing APK file",
        task: () =>
          new Observable(subscriber => {
            async () => {
              const apkFiles = await globby(path.join(DECODE_DIR, "**/*.apk"));

              for (const filePath of apkFiles) {
                await executeBin("apksigner", [
                  "sign",
                  "--ks debug.keystore",
                  "--ks-pass pass:android",
                  filePath
                ]);
              }

              subscriber.complete();
            };
          })
      },
      {
        title: "Zipping all the apk files",
        task: async () => {
          const bundleExtension: string = path.extname(apkPath);
          const finishedBundleName: string = `${path.basename(
            apkPath,
            bundleExtension
          )}-patched.${bundleExtension}`;
          const finishedBundlePath: string = path.join(
            path.dirname(apkPath),
            finishedBundleName
          );
          const apkFiles = await globby(path.join(DECODE_DIR, "**/*.apk"));
          await compression.zip(finishedBundlePath, apkFiles);
        }
      }
    ],
    {
      exitOnError: true
    }
  )
}
