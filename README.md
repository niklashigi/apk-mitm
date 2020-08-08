# apk-mitm

> A CLI application that automatically prepares Android APK files for HTTPS inspection

[![](https://img.shields.io/npm/v/apk-mitm?style=flat-square)](https://www.npmjs.com/package/apk-mitm)

Inspecting a mobile app's HTTPS traffic using a proxy is probably the easiest way to figure out how it works. However, with the [Network Security Configuration][network-security-config] introduced in Android 7 and app developers trying to prevent MITM attacks using [certificate pinning][certificate-pinning], getting an app to work with an HTTPS proxy has become quite tedious.

`apk-mitm` automates the entire process. All you have to do is give it an APK file and `apk-mitm` will:

- decode the APK file using [Apktool][apktool]
- modify the app's `AndroidManifest.xml` to make it [`debuggable`][manifest-debuggable]
- modify the app's [Network Security Configuration][network-security-config] to allow user-added certificates
- [insert `return-void` opcodes][patch-certificate-pinning] to disable [certificate pinning][certificate-pinning] logic
- encode the patched APK file using [Apktool][apktool]
- sign the patched APK file using [uber-apk-signer][uber-apk-signer]

You can also use `apk-mitm` to [patch apps using Android App Bundle](#patching-app-bundles) and rooting your phone is **not** required.

## Usage

If you have an up-to-date version of [Node.js][node] (10+) and [Java][java] (8+), you can run this command to patch an app:

```shell
$ npx apk-mitm <path-to-apk>
```

So, if your APK file is called `example.apk`, you'd run:

```shell
$ npx apk-mitm example.apk

  ✔ Decoding APK file
  ✔ Modifying app manifest
  ✔ Modifying network security config
  ✔ Disabling certificate pinning
  ✔ Encoding patched APK file
  ✔ Signing patched APK file

   Done!  Patched APK: ./example-patched.apk
```

You can now install the `example-patched.apk` file on your Android device and use a proxy like [Charles][charles] or [mitmproxy][mitmproxy] to look at the app's traffic.

### Patching App Bundles

You can also patch apps using [Android App Bundle](android-app-bundle) with `apk-mitm` by providing it with a `*.xapk` file (for example from [APKPure][apkpure]) or a `*.apks` file (which you can export yourself using [SAI][sai]).

### Making manual changes

Sometimes you'll need to make manual changes to an app in order to get it to work. In these cases the `--wait` option is what you need. Enabling it will make `apk-mitm` wait before re-enconding the app, allowing you to make changes to the files in the temporary directory.

## Caveats

- If the app uses Google Maps and the map is broken after patching, then the app's API key is probably [restricted to the developer's certificate][google-api-key-restrictions]. You'll have to [create your own API key][google-maps-android] without restrictions and run `apk-mitm` with [the `--wait` option](#making-manual-changes) to be able to replace the `com.google.android.geo.API_KEY` value in the app's `AndroidManifest.xml` file.

- If `apk-mitm` crashes while decoding or encoding the issue is probably related to [Apktool][apktool]. Check [their issues on GitHub][apktool-issues] to find possible workarounds. If you happen to find an Apktool version that's not affected by the issue, you can instruct `apk-mitm` to use it by specifying the path of its JAR file through the `--apktool` option.

## Installation

The above example used `npx` to download and execute `apk-mitm` without local installation. If you do want to fully install it, you can do that by running:

```shell
$ npm install -g apk-mitm
```

## Thanks

- [Connor Tumbleson](https://github.com/iBotPeaches) for making [an awesome APK decompiler][apktool]
- [Patrick Favre-Bulle](https://github.com/patrickfav) for making [a very simple tool for signing APKs][uber-apk-signer]

## License

MIT © [Niklas Higi](https://shroudedcode.com)

[network-security-config]: https://developer.android.com/training/articles/security-config
[certificate-pinning]: https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning#what-is-pinning
[manifest-debuggable]: https://developer.android.com/guide/topics/manifest/application-element#debug
[patch-certificate-pinning]: https://mobile-security.gitbook.io/mobile-security-testing-guide/android-testing-guide/0x05c-reverse-engineering-and-tampering#patching-example-disabling-certificate-pinning

[node]: https://nodejs.org/en/download/
[java]: https://www.oracle.com/technetwork/java/javase/downloads/index.html

[google-maps-android]: https://console.cloud.google.com/google/maps-apis/apis/maps-android-backend.googleapis.com
[google-api-key-restrictions]: https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions
[android-app-bundle]: https://developer.android.com/platform/technology/app-bundle/
[apkpure]: https://apkpure.com/
[sai]: https://github.com/Aefyr/SAI

[charles]: https://www.charlesproxy.com/
[mitmproxy]: https://mitmproxy.org/

[apktool]: https://ibotpeaches.github.io/Apktool/
[apktool-issues]: https://github.com/iBotPeaches/Apktool/issues
[uber-apk-signer]: https://github.com/patrickfav/uber-apk-signer
