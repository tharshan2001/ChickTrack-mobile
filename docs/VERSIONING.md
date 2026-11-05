# Updating the App Version

Use this guide for a ChickTrack mobile release or test build. The current app and runtime version is `1.0.0`.

## When to bump the version

- You have a new feature, bug fix, or release that goes to production.
- You are asked by a team lead, PM, or developer to publish a new build.
- You need a new APK for testing on a device.

## Step 1 — Decide the new version number

Follow [semantic versioning](https://semver.org/):

| Bump type | When to use | Example |
|-----------|-------------|---------|
| **MAJOR** (X.0.0) | Breaking changes, redesign | `0.9.0` → `1.0.0` |
| **MINOR** (0.X.0) | New features, backwards compatible | `1.0.0` → `1.1.0` |
| **PATCH** (0.0.X) | Bug fixes, small tweaks | `1.0.0` → `1.0.1` |

Confirm the new version with the requesting developer/PM before proceeding.

## Step 2 — Ask: Local or Cloud build?

### Question to ask

> *"Do you want a local EAS build, or a cloud EAS build?"*

### Comparison

| Build type | Use when | Pros | Cons |
|------------|----------|------|------|
| **Local EAS** (`eas build -p android --profile production --local`) | Quick device iteration using the project’s EAS configuration | No upload or cloud queue, keeps build configuration consistent | Requires local Android/Java toolchain and local build resources |
| **Cloud EAS** (`eas build -p android --profile preview` or `production`) | Preview, production, Play Store, or shared team builds | Consistent remote environment, managed signing, CI-friendly | Upload and queue time; requires Expo account and may use EAS plan |

### Default recommendation

If unsure, ask:

1. *"Is this going to the Play Store?"* → **Cloud EAS production**
2. *"Is this for testing on a device?"* → **Local EAS development** or **cloud preview**
3. *"Is this a hotfix to fix a critical bug?"* → Validate with a local development build, then release through **cloud production**

## Step 3 — Update version numbers

For normal releases, update these fields together:

- `expo.version` in `app.json`
- `expo.ios.runtimeVersion` in `app.json` (if present)
- `expo.android.runtimeVersion` in `app.json` (if present)
- `version` in `package.json`
- Matching `version` entries in `package-lock.json` when npm regenerates the lockfile

`eas.json` uses `appVersionSource: "remote"` and `production.autoIncrement: true`, so EAS manages the Android `versionCode`. Do not maintain or edit a separate `android/app/build.gradle` version for normal releases; this repository does not contain a checked-in `android/` project.

## Step 4 — Validate before building

From the repository root:

```bash
npm install
npx expo-doctor
npm test -- --runInBand
```

Resolve dependency mismatches before releasing.

## Step 5 — Build

### Local development build

```bash
eas build -p android --profile development --local
```

### Cloud preview build

```bash
eas build -p android --profile preview
```

### Cloud production build

```bash
eas build -p android --profile production
```

### Local production build

```bash
eas build -p android --profile production --local
```

EAS manages production signing through the project configuration. Do not introduce a local release keystore unless the release owner explicitly changes the signing strategy.

## Step 6 — Publish an OTA update

```bash
eas update --channel production
```

An update is delivered only to native builds whose runtime version matches the update. After a native dependency, permission, or Expo SDK change, create a new EAS build instead of publishing an OTA update over an incompatible runtime.

## Step 7 — Verify the release

- Confirm the EAS build reports the expected app version and runtime version.
- Confirm the Android package is `com.chick.chicktrack`.
- Install the build on a clean device and verify login, offline rendering, and a production-channel update.
- Keep the build and update channels aligned (`development`, `preview`, or `production`).

## Common mistakes

- Changing only `app.json` and forgetting `package.json`.
- Publishing an OTA update to a build with a different runtime version.
- Using a local Gradle build as the release source of truth.
- Treating unused dependencies as part of runtime navigation.
