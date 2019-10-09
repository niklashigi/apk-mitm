# apk-mitm

> A CLI that automatically prepares Android APK files for MITM

[![](https://img.shields.io/npm/v/apk-mitm?style=flat-square)](https://www.npmjs.com/package/apk-mitm)

Inspecting a mobile app's HTTPS traffic is probably the easiest way to reverse-engineer its behavior. However, with the [Network Security Configuration][network-security-config] introduced in Android 7 and app developers trying to prevent MITM attacks using [certificate pinning][certificate-pinning], getting an app to work with an HTTPS proxy has become quite tedious.

`apk-mitm` automates the entire process. All you have to do is give it an APK file and `apk-mitm` will:

- decode the APK file using [Apktool][apktool]
- modify the app's `AndroidManifest.xml` to make it [`debuggable`][manifest-debuggable]
- modify the app's [Network Security Configuration][network-security-config] to allow user-added certificates
- [insert `return-void` opcodes][patch-certificate-pinning] to disable [certificate pinning][certificate-pinning] logic
- encode the patched APK file using [Apktool][apktool]
- sign the patched APK file using [uber-apk-signer][uber-apk-signer]

## Usage

If you have an up-to-date version of [Node.js][node] (8.2+) and [Java][java] (8+), you can run this command to patch an app:

```shell
$ npx apk-mitm <path-to-apk>
```

So, if your APK file is called `example.apk`, you'd run:

```shell
$ npx apk-mitm example.apk

  ╭ apk-mitm v0.0.0
  ├ apktool commit 683fef3
  ╰ uber-apk-signer v1.1.0

  ✔ Decoding APK file
  ✔ Modifying app manifest
  ✔ Modifying network security config
  ✔ Disabling certificate pinning
  ✔ Encoding patched APK file
  ✔ Signing patched APK file

   Done!  Patched APK: ./example-patched.apk

```

You can now install the `example-patched.apk` file on your device and use a proxy like [Charles][charles] or [mitmproxy][charles] to look at the app's traffic.

## Caveats

- If you open the patched app on your phone and get a dialog saying *The app is missing required components and must be reinstalled from the Google Play Store*, then the app is using [Android App Bundle][android-app-bundle]. This means that installing it through an APK is not going to work **regardless** of whether it has been patched by `apk-mitm` or not.

- If the app uses Google Maps and the map is broken after patching, then the app's API key is probably [restricted to the developer's certificate][google-api-key-restrictions]. You'll have to [create your own API key][google-maps-android] without restrictions and replace it in the app's `AndroidManifest.xml` file.

- If `apk-mitm` crashes while decoding or encoding the issue is probably related to [Apktool][apktool]. Check [their issues on GitHub][apktool-issues] to find possible workarounds.

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
[certificate-pinning]: https://www.owasp.org/index.php/Certificate_and_Public_Key_Pinning#What_Is_Pinning.3F
[manifest-debuggable]: https://developer.android.com/guide/topics/manifest/application-element#debug
[patch-certificate-pinning]: https://github.com/OWASP/owasp-mstg/blob/master/Document/0x05c-Reverse-Engineering-and-Tampering.md#patching-example-disabling-certificate-pinning

[node]: https://nodejs.org/en/download/
[java]: https://www.oracle.com/technetwork/java/javase/downloads/index.html

[google-maps-android]: https://console.cloud.google.com/google/maps-apis/apis/maps-android-backend.googleapis.com
[google-api-key-restrictions]: https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions
[android-app-bundle]: https://developer.android.com/platform/technology/app-bundle/

[charles]: https://www.charlesproxy.com/
[mitmproxy]: https://mitmproxy.org/

[apktool]: https://ibotpeaches.github.io/Apktool/
[apktool-issues]: https://github.com/iBotPeaches/Apktool/issues
[uber-apk-signer]: https://github.com/patrickfav/uber-apk-signer
