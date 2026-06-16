---
name: EAS SDK56 + Metro 0.84 compat build setup
description: How the EAS custom build workflow patches @expo/cli Metro bug for SDK 56
---

## The bug
Metro 0.84's IncrementalBundler.getBundler() can return undefined during EAS macOS init.
@expo/cli@56.1.16 crashes: "Cannot read properties of undefined (reading 'transformFile')"
Two call sites: packedMap.js and instantiateMetro.js

## The fix
Custom EAS build YAML (`artifacts/dial-in/.eas/build/ios-production.yml`) runs
`node scripts/src/patch-expo-sdk56-compat.cjs` AFTER `eas/install_pods`, BEFORE `eas/run_fastlane`.

**Why after install_pods:** Running the patch during pnpm postinstall caused pod install UNKNOWN_ERROR
(EAS partial outage was also a factor for builds #16-17, but safe to keep patch after pods).

## eas.json config field
The correct field name is `"config": "ios-production.yml"` (plain string, NOT `"customBuildConfig"`).
EAS prepends `.eas/build/` automatically — so "ios-production.yml" → `.eas/build/ios-production.yml`.
EAS schema source: `@expo/eas-json/build/build/schema.js`, `CommonBuildProfileSchema`.

## EAS_NO_VCS=1 CWD on build worker
Custom `run:` steps execute from the monorepo root (where pnpm-workspace.yaml is).
`process.cwd() + '/node_modules/.pnpm'` correctly finds the pnpm virtual store.
`node scripts/src/patch-expo-sdk56-compat.cjs` path is relative to monorepo root. ✓

## Patch patterns verified locally
- `@expo+cli@56.1.16` instantiateMetro.js: sentinel SDK56_COMPAT_PATCH_2 confirmed at line 398 (patched locally)
- `@expo+metro-config@56.0.14` packedMap.js: sentinel SDK56_COMPAT_PATCH_1 confirmed at line 170 (patched locally)
- EAS fresh installs will NOT have these sentinels, so pattern match will fire correctly.

## EAS pnpm patchedDependencies
EAS Build does NOT apply pnpm `patchedDependencies` — confirmed builds #14-15.
The custom YAML patch script is the correct mechanism.

## EAS outage (June 16 2026)
Partial outage "Workflows impacted by NPM install timeouts and failures" affected:
- Project upload (hung before build queued)
- Pod install on build workers (explains #16-17 UNKNOWN_ERROR)
Wait for status.expo.dev to clear before retrying.

## Build number
app.json buildNumber: "18", version: "1.0.0", autoIncrement: false in eas.json.
