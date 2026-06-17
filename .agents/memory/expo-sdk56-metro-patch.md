---
name: Expo SDK 56 Metro 0.84 crash fix
description: Three crash sites in @expo/cli@56.1.16 for production iOS export builds; root cause, fix locations, and dual-mechanism patch strategy.
---

# Expo SDK 56 + Metro 0.84 — Production Build Crash Fix

## Root Cause
In production/export mode (`isExporting=true`), `instantiateMetro.js` calls
`Metro.runServer(..., { mockServer: true })`. The returned mock server's
`metro.getBundler().getBundler()` returns `undefined` because the Bundler is
not fully initialized in mock-server mode.

## Three Crash Sites

### Site 1 — `instantiateMetro.js` ~line 319
```js
const getMetroBundler = ()=>metro.getBundler().getBundler();
```
This closure is passed to `loadMetroConfigAsync` → `withMetroMultiPlatform`,
where it's called as `getMetroBundlerWithVirtualModules(getMetroBundler())`.
When it returns `undefined`, Site 3 crashes.

**Fix:** guard the return value:
```js
const getMetroBundler = ()=>{ const ob = metro.getBundler(); return ob && typeof ob.getBundler === 'function' ? ob.getBundler() : undefined; };
```

### Site 2 — `instantiateMetro.js` ~line 398
```js
const originalTransformFile = metro.getBundler().getBundler().transformFile.bind(metro.getBundler().getBundler());
```
Direct crash if bundler is undefined.

**Fix:** guard with `_innerBundler` null check (see patch).

### Site 3 — `metroVirtualModules.js` ~line 51
```js
function getMetroBundlerWithVirtualModules(bundler) {
    if (!bundler.transformFile.__patched) { // crashes if bundler=undefined
```
Called from `withMetroMultiPlatform.js` with the result of `getMetroBundler()`.

**Fix:** early return no-op at top of function:
```js
if (!bundler || typeof bundler.transformFile !== 'function') {
    const noop = { setVirtualModule: function() {}, hasVirtualModule: function() { return false; } };
    return ensureMetroBundlerPatchedWithSetVirtualModule(bundler || noop);
}
```

## Sentinels
- `/* SDK56_COMPAT_PATCH */` — added to `instantiateMetro.js` by Site 2 fix
- `/* SDK56_COMPAT_VIRTUAL */` — added to `metroVirtualModules.js` by Site 3 fix

## Dual-Mechanism Fix
1. **Primary:** `patches/@expo__cli@56.1.16.patch` — pnpm patchedDependencies in `pnpm-workspace.yaml`; applied during `pnpm install` on EAS fresh worker.
2. **Fallback:** `scripts/src/patch-expo-sdk56-compat.cjs` — postinstall script; idempotent via sentinels; covers all three sites.

**Why:** pnpm patch can fail silently if the store caches an old patched version. Postinstall runs after every install and catches any misses.

## `pruneCustomTransformOptions` signature
Original (and patched) takes `(projectRoot, filePath, transformOptions)` — three args. Earlier postinstall versions incorrectly omitted `projectRoot`.
