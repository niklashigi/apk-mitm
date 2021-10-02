# Troubleshooting Guide

Reverse-engineering Android apps can be a messy process. `apk-mitm` greatly simplifies a part of it by automating a series of steps that would have to be performed manually otherwise. However, it can't guarantee that this always works, so that's why this troubleshooting guide exists.

## Types of issues

There's three main types of issues that can occur with `apk-mitm`:

- [**Patching an APK fails**](./patching-fails.md)
  <br>_You're seeing errors in your terminal while running `apk-mitm`._

- **A patched APK can't be installed**
  <br>_Trying to install the APK on your device produces an error message._

- **An installed patched APK is broken**
  <br>_The patched app is either not working at all or you're unable to look at its traffic._
