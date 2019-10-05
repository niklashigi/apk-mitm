# apk-mitm

Inspecting a mobile app's HTTPS traffic is probably the easiest way to reverse-engineer its behavior. However, with the [Network Security Configuration](https://developer.android.com/training/articles/security-config) introduced in Android 7 and app developers trying to prevent MITM attacks using [certificate pinning](https://www.owasp.org/index.php/Certificate_and_Public_Key_Pinning#What_Is_Pinning.3F), getting an app to work with an HTTPS proxy has become quite tedious. `apk-mitm` automates the entire process: All you have to do is give it an APK file, `apk-mitm` will apply all the necessary changes for you and output an APK that's ready for MITM.

## Usage

If you have an up-to-date version of [Node.js](https://nodejs.org/en/download/) (8.2+) and [Java](https://www.oracle.com/technetwork/java/javase/downloads/index.html) (8+), you can run this command to patch an app:

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

You can now install the `example-patched.apk` file on your device and use a proxy like [Charles](https://www.charlesproxy.com/) or [mitmproxy](https://mitmproxy.org/) to look at the app's traffic.

## Caveats

- If you open the patched app on your phone and get a dialog saying *The app is missing required components and must be reinstalled from the Google Play Store*, then the app is using [Android App Bundle](https://developer.android.com/platform/technology/app-bundle/). This means that installing it through an APK is not going to work **regardless** of whether it has been patched by `apk-mitm` or not.

- If the app uses Google Maps and the map is broken after patching, then the app's API key is probably [restricted to the developer's certificate](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions). You'll have to [create your own API key](https://console.cloud.google.com/google/maps-apis/apis/maps-android-backend.googleapis.com) without restrictions and replace it in the app's `AndroidManifest.xml` file.

- If `apk-mitm` crashes while decoding or encoding the issue is probably related to [Apktool](https://ibotpeaches.github.io/Apktool/). Check [their issues on GitHub](https://github.com/iBotPeaches/Apktool/issues) to find possible workarounds.

## Installation

The above example used `npx` to download and execute `apk-mitm` without local installation. If you do want to fully install it, you can do that by running:

```shell
$ npm install -g apk-mitm
```

## Thanks

- [Connor Tumbleson](https://github.com/iBotPeaches) for making [an awesome APK decompiler](https://github.com/iBotPeaches/Apktool)
- [Patrick Favre-Bulle](https://github.com/patrickfav) for making [a very simple tool for signing APKs](https://github.com/patrickfav/uber-apk-signer)

## License

MIT © [Niklas Higi](https://shroudedcode.com)
