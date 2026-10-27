# Mingalar Cinema for Android

An Android WebView app for https://mingalar-cinema.vercel.app. The existing Next.js website and its server remain the source of the interface, accounts, bookings, and payments. Internet access is required; this does not bundle the Next.js server or provide offline booking.

## Build and install

Open this `android` folder in Android Studio. Install SDK Platform 35 and Build Tools 35.0.0, and use JDK 17 or 21. Alternatively, with `ANDROID_HOME` configured:

```sh
./gradlew assembleDebug testDebugUnitTest lintDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The universal debug APK is suitable for testing and direct installation on Android 7.0+ phones and tablets with an updated Android System WebView or Chrome (Chromium 111+). It contains no native libraries or CPU architecture restrictions, so the same APK can install on ARM, ARM64, x86, and x86-64 devices. Enable installation from your chosen file manager when Android prompts. The default website is already configured; override it without changing source:

```sh
./gradlew assembleDebug -PwebsiteUrl=https://your-domain.example
```

For the Android emulator and a locally running Next.js server:

```sh
./gradlew assembleDebug -PwebsiteUrl=http://10.0.2.2:3000
```

Cleartext HTTP is allowed only in debug builds. Release builds require HTTPS. Never ship the debug APK as a production release. Use Android Studio's **Generate Signed Bundle / APK** to create a release with your own private signing key; keep the key and passwords outside Git. `./gradlew bundleRelease` produces an unsigned release bundle until signing is configured. Play Store submission, signing, and approval are separate steps.

## Behavior and limits

- Same-origin website navigation stays inside the app; external HTTPS, phone, email, and KBZPay links open a suitable installed app. Unsupported URL schemes are blocked.
- Android Back follows browsing history before closing the activity. Cookies persist between launches. Loading failures show a retry screen. System bars and display cutouts are accounted for.
- Phone/tablet portrait, landscape, foldable resizing, and split-screen use the website's responsive layout. Routine rotation and window resizing retain the current WebView and form state. Android 13+ uses the platform's current Back callback; older Android versions use the existing Back button behavior.
- Devices with missing or outdated WebView receive an update/browser fallback instead of attempting to run an unsupported website. Android 6 and earlier are excluded because their available Chromium engines cannot satisfy Next.js 16's browser baseline. Android 7 supports the website with Chromium 111–119, but its OS and browser no longer receive security updates; use a maintained Android version for payment and account activity. APKs cannot install on iPhones, iPads, Windows, or macOS; those devices must use the browser or install the website as a web app where supported.
- HTTPS verification is enforced, mixed content is blocked, and there is no native JavaScript bridge or file-system access. Debug inspection is disabled in release builds.
- File upload uses Android's file picker. Downloads open in the browser; authenticated PDF endpoints may require signing in there separately.
- Use the website's email/password sign-in inside the app. Google/Apple OAuth uses external pages and does not transfer a browser login session back to the WebView. Native OAuth callbacks are not implemented.
- Native camera scanning, push notifications, background/offline bookings, and automatic payment-app return links are not implemented. Use the website in a browser for staff QR scanning. After paying in another app, return to the cinema app and check the booking status; the server's verified webhook remains authoritative.

## Validation

`testDebugUnitTest` tests same-origin routing, deceptive/malformed hosts, missing URLs, HTTPS downgrades, ports, supported external schemes, and supported WebView versions. `assembleDebug` checks Android resource processing and Java compilation; `lintDebug` checks Android APIs and configuration. These do not replace installing on actual devices and testing login, seat selection, checkout, PDFs, rotation, split-screen, outdated-WebView fallback, and payment-app return with the live website. Device/browser compatibility is a documented target, not a claim that every device has been physically tested.
