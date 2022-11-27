# apk-mitm

> A CLI application that automatically prepares Android APK files for HTTPS inspection

[![](https://img.shields.io/npm/v/apk-mitm?style=flat-square)](https://www.npmjs.com/package/apk-mitm)

Inspecting a mobile app's HTTPS traffic using a proxy is probably the easiest way to figure out how it works. However, with the [Network Security Configuration][network-security-config] introduced in Android 7 and app developers trying to prevent MITM attacks using [certificate pinning][certificate-pinning], getting an app to work with an HTTPS proxy has become quite tedious.

`apk-mitm` automates the entire process. All you have to do is give it an APK file and `apk-mitm` will:

- decode the APK file using [Apktool][apktool]
- replace the app's [Network Security Configuration][network-security-config] to allow user-added certificates
- modify the source code to disable various [certificate pinning][certificate-pinning] implementations
- encode the patched APK file using [Apktool][apktool]
- sign the patched APK file using [uber-apk-signer][uber-apk-signer]

You can also use `apk-mitm` to [patch apps using Android App Bundle](#patching-app-bundles) and rooting your phone is **not** required.

## Installation

If you have an up-to-date version of [Node.js][node] (14+) and [Java][java] (8+), you can install `apk-mitm` by running:

```shell
$ npm install -g apk-mitm
```

### Docker

`apk-mitm` can also be used with Docker, without installing any package in your system.
Check the `Dockerfile` in this repository.

```shell
docker build -t apk-mitm .
docker run --rm -it -v $(pwd):/app apk-mitm:latest apk-mitm <path-to-apk>
```

## Usage

Once installed, you can run this command to patch an app:

```shell
$ apk-mitm <path-to-apk>
```

So, if your APK file is called `example.apk`, you'd run:

```shell
$ apk-mitm example.apk

  ✔ Decoding APK file
  ✔ Modifying app manifest
  ✔ Replacing network security config
  ✔ Disabling certificate pinning
  ✔ Encoding patched APK file
  ✔ Signing patched APK file

   Done!  Patched APK: ./example-patched.apk
```

You can now install the `example-patched.apk` file on your Android device and use a proxy like [Charles][charles] or [mitmproxy][mitmproxy] to look at the app's traffic.

### Patching App Bundles

You can also patch apps using [Android App Bundle](android-app-bundle) with `apk-mitm` by providing it with a `*.xapk` file (for example from [APKPure][apkpure]) or a `*.apks` file (which you can export yourself using [SAI][sai]). If you're doing this on Linux, make sure that both `zip` and `unzip` are installed.

### Making manual changes

Sometimes you'll need to make manual changes to an app in order to get it to work. In these cases the `--wait` option is what you need. Enabling it will make `apk-mitm` wait before re-enconding the app, allowing you to make changes to the files in the temporary directory.

If you want to experiment with different changes to an APK, then using `--wait` is probably not the most convenient option as it forces you to start from scratch every time you use it. In this case you might want to take a look at [APKLab][apklab]. It's an Android reverse engineering workbench built on top of VS Code that comes with [`apk-mitm` support][apklab-mitm] and should allow you to iterate much more quickly.

### Allowing specific certificates

On some devices (like Android TVs) you might not be able to add a new certificate to the system's root certificates. In those cases you can still add your proxy's certificate [directly to the app's Network Security Config][network-security-config-custom-ca] since that will work on any device. You can accomplish this by running `apk-mitm` with the `--certificate` flag set to the path of the certificate (`.pem` or `.der` file) used by your proxy.

## Caveats

- If the app uses Google Maps and the map is broken after patching, then the app's API key is probably [restricted to the developer's certificate][google-api-key-restrictions]. You'll have to [create your own API key][google-maps-android] without restrictions and run `apk-mitm` with [the `--wait` option](#making-manual-changes) to be able to replace the `com.google.android.geo.API_KEY` value in the app's `AndroidManifest.xml` file.

- If `apk-mitm` crashes while decoding or encoding the issue is probably related to [Apktool][apktool]. Check [their issues on GitHub][apktool-issues] to find possible workarounds. If you happen to find an Apktool version that's not affected by the issue, you can instruct `apk-mitm` to use it by specifying the path of its JAR file through the `--apktool` option.

## Thanks

- [Connor Tumbleson](https://github.com/iBotPeaches) for making [an awesome APK decompiler][apktool]
- [Patrick Favre-Bulle](https://github.com/patrickfav) for making [a very simple tool for signing APKs][uber-apk-signer]
- [Ryan Welton](https://github.com/Fuzion24) for [inspiring most of the certificate pinning removal code](https://github.com/Fuzion24/JustTrustMe)

## License

MIT © [Niklas Higi](https://shroudedcode.com)

[network-security-config]: https://developer.android.com/training/articles/security-config
[network-security-config-custom-ca]: https://developer.android.com/training/articles/security-config#ConfigCustom
[certificate-pinning]: https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning#what-is-pinning
[node]: https://nodejs.org/en/download/
[java]: https://www.oracle.com/technetwork/java/javase/downloads/index.html
[apklab]: https://github.com/Surendrajat/APKLab
[apklab-mitm]: https://github.com/Surendrajat/APKLab#apply-mitm-patch
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
