---
name: EAS build patch strategy for @expo/cli SDK 56 compat
description: How the @expo/cli Metro 0.84 patch is applied on EAS and why both postinstall and eas-build-post-install are needed.
---

## CRITICAL: Commit ALL fix files before EAS submit

EAS clones from git HEAD. If `pnpm-lock.yaml` or `patches/` are modified locally but not committed, EAS uses the OLD buggy versions from HEAD. This caused builds #28–#30 to ALL fail with the same crash despite local fixes being in place.

Files that MUST be committed together every time a patch is changed:
- `patches/@expo__cli@56.1.16.patch` — the actual diff
- `pnpm-lock.yaml` — contains `hash:` field matching the patch content
- `scripts/src/patch-expo-sdk56-compat.cjs` — postinstall fallback
- `artifacts/dial-in/app.json` — buildNumber bump for each EAS submit

## The rule
Always add `eas-build-post-install` to `artifacts/dial-in/package.json` alongside the root `postinstall` when patching packages that need to work on EAS builds. Root `postinstall` is skipped when EAS uses `--ignore-scripts`.

**Why:** EAS Build runs `pnpm install` with `--ignore-scripts` (or equivalent), which skips `postinstall` lifecycle scripts. The `eas-build-post-install` npm script in the app's `package.json` is run explicitly by EAS as a lifecycle hook, independent of `--ignore-scripts`. This is how to guarantee a post-install script runs on EAS.

**How to apply:** Any time a `postinstall` in `package.json` is critical for EAS builds (e.g. patching node_modules), mirror it in `artifacts/dial-in/package.json` as `eas-build-post-install`. Use a relative path: `node ../../scripts/src/<script>.cjs`.

## Path resolution
When `eas-build-post-install` runs from `artifacts/dial-in/`, `process.cwd()` is the app dir. The PNPM_STORE fallback chain in the patch script:
1. `process.cwd()/node_modules/.pnpm` — won't exist in a workspace
2. `process.env.EAS_BUILD_WORKINGDIR/node_modules/.pnpm` — set on EAS, points to monorepo root
3. `__dirname/../../node_modules/.pnpm` — `scripts/src/../../` = monorepo root ← fallback

## pnpm patch mechanics
- pnpm patches are applied during `pnpm install --frozen-lockfile` (EAS uses this)
- The lockfile's `patchedDependencies.hash` must match the patch file content — if they differ, pnpm errors
- After running `pnpm install` locally (to regenerate the lockfile hash), BOTH the patch file AND pnpm-lock.yaml must be committed

## How EAS resolves @expo/cli
The expo binary at `artifacts/dial-in/node_modules/.bin/expo` → `expo/bin/cli` → `require('@expo/cli')`. The `expo@56.0.12_a4fc3917` pnpm instance symlinks its `@expo/cli` to the PATCHED `@expo+cli@56.1.16_patch_hash=91240e1b...` instance. The Xcode build phase also resolves `CLI_PATH` via `require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })` which follows the same symlink.

## pnpm patch caveat
`pnpm patchedDependencies` only patches ONE peer-dep variant of the package (the one whose peer deps match the patched lockfile entry). Other peer-dep variants of the same version remain unpatched. The `eas-build-post-install` postinstall covers ALL variants by iterating `node_modules/.pnpm` entries.

## Sentinel note
The current sentinel is `/* SDK56_COMPAT_PATCH */`. Older patch attempts used `/* SDK56_COMPAT_PATCH_2 */`. These are DIFFERENT strings — `includes()` won't match cross-generation. On a fresh EAS install the sentinel is absent and patterns apply cleanly.
