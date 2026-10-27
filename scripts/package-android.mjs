import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Run after ./android/gradlew -p android assembleDebug. Explicitly package
// the current build, never a directory from a different checkout.
const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolve(root, "android/app/build/outputs/apk/debug/app-debug.apk");
const bytes = await readFile(source);
if (bytes.length < 4 || bytes.readUInt32LE(0) !== 0x04034b50) {
  throw new Error("The Android build output is not an APK/ZIP archive");
}
const directory = resolve(root, "public/downloads");
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "mingalar-cinema.apk"), bytes);
await writeFile(resolve(directory, "mingalar-cinema.apk.sha256"),
  `${createHash("sha256").update(bytes).digest("hex")}  mingalar-cinema.apk\n`);
console.log(`Packaged Android test APK (${bytes.length} bytes) in public/downloads. Deploy the website to publish it.`);
