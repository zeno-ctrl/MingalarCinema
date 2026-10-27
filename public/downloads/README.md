# Android test download

`mingalar-cinema.apk` is the debug-signed Android package linked from `/download`.
It is shipped as a public static asset so visitors can download it over HTTPS
from the deployed website, without access to the development workspace.

To refresh it from a verified Android build, run from the repository root:

```sh
./android/gradlew -p android assembleDebug testDebugUnitTest lintDebug
node scripts/package-android.mjs
```

The packaging script also updates `mingalar-cinema.apk.sha256`. Never place
signing keys, keystores or passwords here. This is a test package, not a signed
Play Store release. Deploy these files with the website before advertising its
HTTPS download URL. A workspace link or an undeployed route is not a public link.
