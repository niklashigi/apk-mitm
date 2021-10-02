# Reading logs

A fairly simple, but effective first step for resolving issues with an APK is to look at the logs of the app at runtime. This page aims to explain how this can be done in a technical sense and should also give you a basic understanding of how you can read and interpret logs.

## Using `adb logcat`

The standard way to retrieve logs from Android devices is the `adb logcat` command. It allows you to stream the logs of all the apps and system services running on your Android device to your computer. It's part of the [Android Debug Bridge (`adb`)](https://developer.android.com/studio/command-line/adb), so make sure you have that installed (it's often installed as part of the Android SDK).

After [connecting your device](https://developer.android.com/studio/command-line/adb#Enabling), you should be able to run:

```
adb logcat
```

This will probably give you a _huge_ stream of logs, most of which aren't related to the app in question at all, so what you'll want to do is filter them by app.

## Filtering by app

There's [quite a few hacky ways](https://stackoverflow.com/questions/6854127/filter-logcat-to-get-only-the-messages-from-my-application-in-android) to do this, but I strongly recommend using [`pidcat`](https://github.com/JakeWharton/pidcat). It's a small wrapper around `adb logcat` that allows you to specify a package name to filter by and generally formats the logs in a much more readable way.

After [installing `pidcat`](https://github.com/JakeWharton/pidcat#install), you should be able to run:

```
pidcat <package>
```

`<package>` is the package name of the app. If you wanted to see the logs of the GitHub Android app for example, you'd run:

```
pidcat com.github.android
```

Once `pidcat` is running you can try to reproduce the issue you were running into. If, for example, you were unable to access a certain page within the app due to a weird networking error, you could try going back and opening the page again. In the case that the issue occurs directly after opening the app, just close the app and reopen it. If you're lucky you should now see some helpful logs in your terminal.

## Finding the right logs

It's not uncommon for Android app logs to be filled with all sorts of warnings and errors _even if_ the app hasn't been tampered with, so it can be difficult to figure out which lines are actually relevant to your problem. Here are some tips:

- Try reproducing the problem many times and focus on the **messages that appear in the logs every time**. Focus less on the ones that only appear some of the time.
- Think about **what kinds of errors you are expecting** from the broken behavior you're observing. When trying to intercept an app's HTTPS traffic for example you're mostly interested in errors related to networking and security and can probably ignore warnings about layout and rendering.
- Pay **more attention to errors** than warnings. Warnings can be helpful at times, but in most cases they can be safely ignored.
