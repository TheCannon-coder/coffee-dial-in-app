---
name: EAS build - babel-preset-expo missing
description: pnpm doesn't hoist transitive deps; babel-preset-expo must be a direct dep for EAS builds to work
---

## Rule
`babel-preset-expo` must be a **direct** devDependency of the Expo app workspace (`artifacts/dial-in/package.json`), not just a transitive dep.

**Why:** pnpm only creates `node_modules/<package>` symlinks for direct dependencies. On EAS builds, `@expo/metro-config`'s `treeShakeSerializerPlugin.js` loads `@babel/core`, which then tries to resolve `babel-preset-expo` from the `babel.config.js` directory (`artifacts/dial-in/`). Without a direct-dep symlink, `require.resolve('babel-preset-expo', { paths: ['artifacts/dial-in/'] })` fails → metro's `Bundler._transformer` init crashes silently (caught by `.catch()`) → `_transformer` stays `undefined` → bundling crashes with misleading "Cannot read properties of undefined (reading 'transformFile')".

**How to apply:** Whenever the Expo app workspace changes its babel config or pnpm's hoist settings are strict, ensure `babel-preset-expo` is in `devDependencies`. Current version: `~56.0.0` → resolves to `56.0.15`.

## Diagnostic patches that revealed this (Patch 9 in postinstall script)
Patched `metro/src/Bundler.js` to:
- Store `_initError` in `.catch()` block
- Emit init error as Xcode `error:` lines (`[SDK56_INIT_N]`)
- Re-throw `_initError` in `transformFile` instead of obscure crash

Sentinel: `SDK56_COMPAT_BUNDLER_INIT`. These diagnostic patches remain in the postinstall script and are safe to keep.
