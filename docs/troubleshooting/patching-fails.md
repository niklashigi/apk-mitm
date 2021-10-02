# Patching an APK fails

> The following page deals with issues that arise _while running `apk-mitm`_. Check out the general [Troubleshooting Guide](index.md) page if you're having problems _after_ that (like not being able to see the HTTPS traffic of a patched app).

To understand "patch-time issues" you first need to understand a bit about how `apk-mitm` works, specifically what happens when you use it to patch an APK:

1. The APK is **decoded** using [Apktool](https://github.com/iBotPeaches/Apktool)
2. `apk-mitm` **applies its patches** to the decoded files
3. The patched APK is **encoded** again using [Apktool](https://github.com/iBotPeaches/Apktool)
4. The patched APK is **signed** using [uber-apk-signer](https://github.com/patrickfav/uber-apk-signer)

As you can see, only one of these tasks is really performed by `apk-mitm`. The other three are fully delegated to other tools, which could also be used on their own, but are automatically executed by `apk-mitm` for convenience.

## Finding the culprit

A good first troubleshooting step is to figure out which tool is causing the patching to fail. This can sometimes be a little tricky, but an easy way to start is to skip the task that applies the patches by running your command again with the `--skip-patches` flag:

```sh
$ apk-mitm --skip-patches <path-to-apk>
```

If you were getting errors before and this command runs **successfully**, then you've probably discovered a bug in `apk-mitm` and should report it [here](https://github.com/shroudedcode/apk-mitm/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc).

If, however, this command **still returns an error**, then the hunt continues. There's many possible causes at this point, but the most common one is that Apktool has trouble decoding or encoding the APK, so that's what the rest of this guide is going to focus on. If your issue has nothing to do with Apktool, then it's probably a good idea to [open an issue](https://github.com/shroudedcode/apk-mitm/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc).

## Dealing with Apktool issues

APKs can be pretty complex and they're not really meant to be taken apart again once they've been packaged up by the developer, so it's no surprise that Apktool sometimes has trouble with certain APKs.

In these cases you should report the issue directly to Apktool, **but** please keep in mind the following things:

- Many issues with Apktool are specific to Windows. This is not Apktool's fault, but the result of decades of questionable technical decisions on Microsoft's part resulting in an operating system that [doesn't allow you to name a file `AUX`](https://github.com/shroudedcode/apk-mitm/issues/21#issuecomment-669927441), [has issues with unknown characters in file names](https://github.com/iBotPeaches/Apktool/issues/1460), and [uses different path and line separators than every other major operating system in existence](https://github.com/shroudedcode/apk-mitm/issues/27). Do yourself and the maintainer of Apktool a favor and see if you can also reproduce your issue on Linux before reporting it. Any Linux distribution will work fine and you can totally use a virtual machine.

- AAPT, which is used internally by Apktool, [isn't supported on systems with an ARM processor](https://github.com/iBotPeaches/Apktool/issues/974#issuecomment-110719037) (like Raspberry Pi's). If you've tried using `apk-mitm` on an ARM system, please try again on an x64 system (preferably Linux, see the previous point).

Once you've eliminated these two causes, you should try to reproduce the issue in a setup where `apk-mitm` isn't involved. You can do this by [installing the latest version of Apktool](https://ibotpeaches.github.io/Apktool/install/) and running:

```sh
apktool decode app.apk --output app-decoded
apktool build app-decoded --output app-rebuilt.apk --use-aapt2
# Or, if the above command fails:
apktool build app-decoded --output app-rebuilt.apk
```

This is basically equivalent to running `apk-mitm` with the `--skip-patches` flag, but by running the individual commands yourself you can make sure that it's actually an issue with Apktool, which you can then report through [their issue tracker](https://github.com/iBotPeaches/Apktool/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc).
