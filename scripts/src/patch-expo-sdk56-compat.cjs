/**
 * Patches @expo/cli for Expo SDK 56 + Metro 0.84 compatibility.
 *
 * Root cause: Metro 0.84's IncrementalBundler.getBundler() can return undefined
 * in production export / mock-server mode. @expo/cli@56.1.16 calls into this
 * bundler without guarding, causing crashes:
 *
 *   1. instantiateMetro.js — getMetroBundler closure: metro.getBundler().getBundler()
 *      returns undefined → downstream crash
 *   2. instantiateMetro.js — transformFile section: direct getBundler().getBundler()
 *      calls with no null check
 *   3. metroVirtualModules.js — getMetroBundlerWithVirtualModules(bundler):
 *      bundler.transformFile.__patched crashes when bundler is undefined
 *
 * This script runs as both:
 *   - root postinstall (may be skipped if EAS uses --ignore-scripts)
 *   - eas-build-post-install hook in artifacts/dial-in/package.json (always runs on EAS)
 *
 * Patches are idempotent via sentinel markers.
 */

'use strict';

const fs = require('fs');
const path = require('path');

console.log('[SDK56 compat] Starting patch script');
console.log('[SDK56 compat] process.cwd():', process.cwd());
console.log('[SDK56 compat] __dirname:', __dirname);
console.log('[SDK56 compat] EAS_BUILD_WORKINGDIR:', process.env.EAS_BUILD_WORKINGDIR || '(not set)');

const SENTINEL_PATCH   = '/* SDK56_COMPAT_PATCH */';
const SENTINEL_VIRTUAL = '/* SDK56_COMPAT_VIRTUAL */';
const SENTINEL_EMBED   = '/* SDK56_COMPAT_EMBED */';

function patchFile(filePath, sentinel, replacements) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  if (content.includes(sentinel)) {
    console.log('[SDK56 compat] Already patched (sentinel found):', filePath);
    return;
  }

  let modified = content;
  let anyApplied = false;
  for (const [fromStr, toStr] of replacements) {
    if (!modified.includes(fromStr)) {
      console.warn('[SDK56 compat] Pattern not found, skipping:', filePath);
      console.warn('[SDK56 compat]   Expected to find:', JSON.stringify(fromStr.slice(0, 80)));
    } else {
      modified = modified.replace(fromStr, toStr);
      anyApplied = true;
    }
  }
  if (anyApplied) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log('[SDK56 compat] Patched:', filePath);
  } else {
    console.warn('[SDK56 compat] Nothing applied to:', filePath);
  }
}

const PNPM_STORE = (function () {
  // Try CWD-relative first (normal local install)
  const cwdBased = path.resolve(process.cwd(), 'node_modules/.pnpm');
  if (fs.existsSync(cwdBased)) {
    console.log('[SDK56 compat] Using CWD-based PNPM_STORE:', cwdBased);
    return cwdBased;
  }

  // On EAS, CWD is the app dir (artifacts/dial-in) — use EAS_BUILD_WORKINGDIR
  const easWorkdir = process.env.EAS_BUILD_WORKINGDIR;
  if (easWorkdir) {
    const easBased = path.join(easWorkdir, 'node_modules/.pnpm');
    if (fs.existsSync(easBased)) {
      console.log('[SDK56 compat] Using EAS_BUILD_WORKINGDIR-based PNPM_STORE:', easBased);
      return easBased;
    }
  }

  // Fallback: relative to this script (scripts/src/ → monorepo root)
  const scriptBased = path.resolve(__dirname, '../../node_modules/.pnpm');
  console.log('[SDK56 compat] Using script-relative PNPM_STORE:', scriptBased, 'exists:', fs.existsSync(scriptBased));
  return scriptBased;
}());

function findFiles(baseDir, relPath) {
  const results = [];
  if (!fs.existsSync(baseDir)) {
    console.warn('[SDK56 compat] PNPM_STORE does not exist:', baseDir);
    return results;
  }
  for (const entry of fs.readdirSync(baseDir)) {
    const candidate = path.join(baseDir, entry, relPath);
    if (fs.existsSync(candidate)) results.push(candidate);
  }
  return results;
}

// ── Patch 1 + 2: instantiateMetro.js ─────────────────────────────────────────
// Fix 1: guard getMetroBundler closure (line ~319)
// Fix 2: guard transformFile section against undefined bundler

const INSTANTIATE_FROM_BUNDLER =
  '    const getMetroBundler = ()=>metro.getBundler().getBundler();';

const INSTANTIATE_TO_BUNDLER =
  `    const getMetroBundler = ()=>{ const ob = metro.getBundler(); return ob && typeof ob.getBundler === 'function' ? ob.getBundler() : undefined; };`;

const INSTANTIATE_FROM_TRANSFORM =
  '    // Patch transform file to remove inconvenient customTransformOptions which are only used in single well-known files.\n' +
  '    const originalTransformFile = metro.getBundler().getBundler().transformFile.bind(metro.getBundler().getBundler());\n' +
  '    metro.getBundler().getBundler().transformFile = async function(filePath, transformOptions, fileBuffer) {\n' +
  '        return originalTransformFile(filePath, pruneCustomTransformOptions(projectRoot, filePath, // Clone the options so we don\'t mutate the original.\n' +
  '        {\n' +
  '            ...transformOptions,\n' +
  '            customTransformOptions: {\n' +
  '                __proto__: null,\n' +
  '                ...transformOptions.customTransformOptions\n' +
  '            }\n' +
  '        }), fileBuffer);\n' +
  '    };\n' +
  '    // Layered on top of the prune patch above. Both fresh worker results\n' +
  '    // and cache hits flow through `Bundler.transformFile`, so wrapping\n' +
  '    // here covers both.\n' +
  '    (0, _packedMap().patchTransformFileForPackedMaps)(metro.getBundler().getBundler());';

const INSTANTIATE_TO_TRANSFORM =
  `    // Patch transform file to remove inconvenient customTransformOptions which are only used in single well-known files.\n` +
  `    ${SENTINEL_PATCH}\n` +
  `    const _innerBundler = metro.getBundler() && typeof metro.getBundler().getBundler === 'function' ? metro.getBundler().getBundler() : null;\n` +
  `    if (_innerBundler && typeof _innerBundler.transformFile === 'function') {\n` +
  `    const originalTransformFile = _innerBundler.transformFile.bind(_innerBundler);\n` +
  `    _innerBundler.transformFile = async function(filePath, transformOptions, fileBuffer) {\n` +
  `        return originalTransformFile(filePath, pruneCustomTransformOptions(projectRoot, filePath, // Clone the options so we don't mutate the original.\n` +
  `        {\n` +
  `            ...transformOptions,\n` +
  `            customTransformOptions: {\n` +
  `                __proto__: null,\n` +
  `                ...transformOptions.customTransformOptions\n` +
  `            }\n` +
  `        }), fileBuffer);\n` +
  `    };\n` +
  `    }\n` +
  `    // Layered on top of the prune patch above. Both fresh worker results\n` +
  `    // and cache hits flow through \`Bundler.transformFile\`, so wrapping\n` +
  `    // here covers both.\n` +
  `    if (_innerBundler && typeof _innerBundler.transformFile === 'function') (0, _packedMap().patchTransformFileForPackedMaps)(_innerBundler);`;

const instantiateFiles = findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/start/server/metro/instantiateMetro.js');
console.log('[SDK56 compat] instantiateMetro.js candidates:', instantiateFiles.length);
for (const f of instantiateFiles) {
  patchFile(f, SENTINEL_PATCH, [
    [INSTANTIATE_FROM_BUNDLER, INSTANTIATE_TO_BUNDLER],
    [INSTANTIATE_FROM_TRANSFORM, INSTANTIATE_TO_TRANSFORM],
  ]);
}

// ── Patch 3: metroVirtualModules.js ──────────────────────────────────────────
// Guard getMetroBundlerWithVirtualModules against undefined bundler (mock-server mode).

const VIRTUAL_FROM =
  'function getMetroBundlerWithVirtualModules(bundler) {\n' +
  '    if (!bundler.transformFile.__patched) {';

const VIRTUAL_TO =
  `function getMetroBundlerWithVirtualModules(bundler) {\n` +
  `    ${SENTINEL_VIRTUAL} if (!bundler || typeof bundler.transformFile !== 'function') {\n` +
  `        const noop = { setVirtualModule: function() {}, hasVirtualModule: function() { return false; } };\n` +
  `        return ensureMetroBundlerPatchedWithSetVirtualModule(bundler || noop);\n` +
  `    }\n` +
  `    if (!bundler.transformFile.__patched) {`;

const virtualFiles = findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/start/server/metro/metroVirtualModules.js');
console.log('[SDK56 compat] metroVirtualModules.js candidates:', virtualFiles.length);
for (const f of virtualFiles) {
  patchFile(f, SENTINEL_VIRTUAL, [
    [VIRTUAL_FROM, VIRTUAL_TO],
  ]);
}

// ── Patch 4: exportEmbedAsync.js ─────────────────────────────────────────────
// Guard patchTransformFileForPackedMaps call in the export:embed path (Xcode build).
// This is the ACTUAL crash site for EAS builds — exportEmbedAsync.js calls
// metro.getBundler().getBundler() without any null check before passing to
// patchTransformFileForPackedMaps, which crashes when Metro 0.84 returns undefined.

const EMBED_FROM =
  '    // The dev server applies the same patch from `instantiateMetro.ts`;\n' +
  '    // this is the export-embed / `expo-updates` path, where `data.map`\n' +
  '    // would otherwise reach Metro\'s readers in the unwrapped wire shape.\n' +
  '    (0, _packedMap().patchTransformFileForPackedMaps)(metro.getBundler().getBundler());';

const EMBED_TO =
  `    // The dev server applies the same patch from \`instantiateMetro.ts\`;\n` +
  `    // this is the export-embed / \`expo-updates\` path, where \`data.map\`\n` +
  `    // would otherwise reach Metro's readers in the unwrapped wire shape.\n` +
  `    ${SENTINEL_EMBED}\n` +
  `    const _embedBundler = metro.getBundler() && typeof metro.getBundler().getBundler === 'function' ? metro.getBundler().getBundler() : null;\n` +
  `    if (_embedBundler && typeof _embedBundler.transformFile === 'function') (0, _packedMap().patchTransformFileForPackedMaps)(_embedBundler);`;

const embedFiles = findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/export/embed/exportEmbedAsync.js');
console.log('[SDK56 compat] exportEmbedAsync.js candidates:', embedFiles.length);
for (const f of embedFiles) {
  patchFile(f, SENTINEL_EMBED, [
    [EMBED_FROM, EMBED_TO],
  ]);
}

// ── Patch 5 (V2): crash-stack logging in exportEmbedBundleAndAssetsAsync ─────
// Emit each stack frame as an Xcode-style "error:" line so EAS surfaces the
// full JS stack in its error summary (plain console.error lines are present in
// the raw Xcode log but EAS only promotes lines that start with "error:").
//
// The unique anchor (finally + devServerManager.stopAsync) is present ONLY in
// exportEmbedBundleAndAssetsAsync — not in exportEmbedAssetsAsync — so the
// match is unambiguous even across multiple file variants.

const SENTINEL_STACK_V2 = '/* SDK56_COMPAT_STACK_V2 */';

const STACK_V2_FROM =
  '        throw error;\n' +
  '    } finally{\n' +
  '        devServerManager.stopAsync();';

const STACK_V2_TO =
  `        ${SENTINEL_STACK_V2} (function() { var _sl = (error && error.stack ? error.stack : String(error)).split('\\n'); _sl.slice(0, 10).forEach(function(l, i) { process.stderr.write('/bundle:' + i + ': error: [SDK56_STACK_' + i + '] ' + l.trim() + '\\n'); }); }());\n` +
  `        throw error;\n` +
  `    } finally{\n` +
  `        devServerManager.stopAsync();`;

const stackV2Files = findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/export/embed/exportEmbedAsync.js');
console.log('[SDK56 compat] exportEmbedAsync.js (stack-v2) candidates:', stackV2Files.length);
for (const f of stackV2Files) {
  patchFile(f, SENTINEL_STACK_V2, [
    [STACK_V2_FROM, STACK_V2_TO],
  ]);
}

// ── Patch 6: tighten patchTransformFileForPackedMaps guard in instantiateMetro ─
// The primary @expo/cli variant already has SENTINEL_PATCH from the pnpm patch,
// so Patch 1+2 skip it — but the pnpm patch still emits the weaker
// `if (_innerBundler)` guard.  This patch tightens it to also verify that
// transformFile is actually a function before calling patchTransformFileForPackedMaps.

const SENTINEL_TRANSFORM_GUARD = '/* SDK56_COMPAT_TRANSFORM_GUARD */';

const TRANSFORM_GUARD_FROM =
  '    if (_innerBundler) (0, _packedMap().patchTransformFileForPackedMaps)(_innerBundler);';

const TRANSFORM_GUARD_TO =
  `    ${SENTINEL_TRANSFORM_GUARD} if (_innerBundler && typeof _innerBundler.transformFile === 'function') (0, _packedMap().patchTransformFileForPackedMaps)(_innerBundler);`;

const instantiateFiles2 = findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/start/server/metro/instantiateMetro.js');
console.log('[SDK56 compat] instantiateMetro.js (transform-guard) candidates:', instantiateFiles2.length);
for (const f of instantiateFiles2) {
  patchFile(f, SENTINEL_TRANSFORM_GUARD, [
    [TRANSFORM_GUARD_FROM, TRANSFORM_GUARD_TO],
  ]);
}

// ── Patch 7: null guard in @expo/metro-config packedMap.js ───────────────────
// The @expo/metro-config used by the patched @expo/cli variant resolves to the
// UNPATCHED peer variant (no patch_hash) which ships from npm WITHOUT any null
// guard on patchTransformFileForPackedMaps.  The pnpm patch for @expo/metro-config
// creates a separate patch_hash variant that IS guarded, but the patched @expo/cli
// does NOT resolve to that variant — it resolves to the plain peer.
//
// This patch adds the same guard that the pnpm patch adds (SDK56_COMPAT_PATCH_1)
// to ALL packedMap.js variants that don't already have it.

const SENTINEL_PACKED_MAP = '/* SDK56_COMPAT_PACKED_MAP */';

const PACKED_MAP_FROM =
  'function patchTransformFileForPackedMaps(bundler) {\n' +
  '    const originalTransformFile = bundler.transformFile.bind(bundler);';

const PACKED_MAP_TO =
  `function patchTransformFileForPackedMaps(bundler) {\n` +
  `    ${SENTINEL_PACKED_MAP} if (!bundler || typeof bundler.transformFile !== 'function') return;\n` +
  `    const originalTransformFile = bundler.transformFile.bind(bundler);`;

const packedMapFiles = findFiles(PNPM_STORE, 'node_modules/@expo/metro-config/build/serializer/packedMap.js');
console.log('[SDK56 compat] packedMap.js candidates:', packedMapFiles.length);
for (const f of packedMapFiles) {
  patchFile(f, SENTINEL_PACKED_MAP, [
    [PACKED_MAP_FROM, PACKED_MAP_TO],
  ]);
}

// ── Patch 8: tighten patchTransformFileForPackedMaps guard in exportEmbedAsync ─
// Same as Patch 6 but for the embed export path.  The pnpm patch emits
// `if (_embedBundler)` without checking that transformFile is a function.

const SENTINEL_EMBED_GUARD = '/* SDK56_COMPAT_EMBED_GUARD */';

const EMBED_GUARD_FROM =
  '    if (_embedBundler) (0, _packedMap().patchTransformFileForPackedMaps)(_embedBundler);';

const EMBED_GUARD_TO =
  `    ${SENTINEL_EMBED_GUARD} if (_embedBundler && typeof _embedBundler.transformFile === 'function') (0, _packedMap().patchTransformFileForPackedMaps)(_embedBundler);`;

const embedFiles2 = findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/export/embed/exportEmbedAsync.js');
console.log('[SDK56 compat] exportEmbedAsync.js (embed-guard) candidates:', embedFiles2.length);
for (const f of embedFiles2) {
  patchFile(f, SENTINEL_EMBED_GUARD, [
    [EMBED_GUARD_FROM, EMBED_GUARD_TO],
  ]);
}

// ── Patch 9: surface metro Bundler._transformer init errors ──────────────────
// Root cause confirmed by build #34 stack trace: metro@0.84.4 Bundler constructor
// initialises _transformer asynchronously inside `_depGraph.ready().then(...)`.
// If that .then() throws (e.g. Transformer constructor crash, watchFolder missing,
// WorkerFarm failure), the .catch() swallows the error — _transformer stays
// undefined.  When bundling starts, `Bundler.transformFile` calls
// `this._transformer.transformFile(...)` → "Cannot read properties of undefined
// (reading 'transformFile')".
//
// This patch:
//   a) Stores the init error on `this._initError` inside the catch block.
//   b) Emits it as Xcode `error:` lines so EAS surfaces the ACTUAL root cause.
//   c) Re-throws `this._initError` inside `transformFile` instead of the
//      misleading `reading 'transformFile'` crash.

const SENTINEL_BUNDLER_INIT = '/* SDK56_COMPAT_BUNDLER_INIT */';

// (a)+(b): store + log the init error in the .catch() block
const BUNDLER_CATCH_FROM =
  '      .catch((error) => {\n' +
  '        console.error("Failed to construct transformer: ", error);\n' +
  '        config.reporter.update({';

const BUNDLER_CATCH_TO =
  `      .catch((error) => {\n` +
  `        ${SENTINEL_BUNDLER_INIT} this._initError = error;\n` +
  `        console.error("Failed to construct transformer: ", error);\n` +
  `        (function(e) { var _sl = (e && e.stack ? e.stack : String(e)).split('\\n'); _sl.slice(0, 8).forEach(function(l, i) { process.stderr.write('/bundler:' + i + ': error: [SDK56_INIT_' + i + '] ' + l.trim() + '\\n'); }); }(error));\n` +
  `        config.reporter.update({`;

// (c): re-throw _initError in transformFile before accessing _transformer
const BUNDLER_XFORM_FROM =
  '    return this._transformer.transformFile(\n' +
  '      filePath,\n' +
  '      transformOptions,\n' +
  '      fileBuffer,\n' +
  '    );';

const BUNDLER_XFORM_TO =
  `    if (!this._transformer) { throw this._initError || new Error('SDK56: metro Bundler._transformer not initialized (transformer_load_failed)'); } /* SDK56_COMPAT_BUNDLER_XFORM */\n` +
  `    return this._transformer.transformFile(\n` +
  `      filePath,\n` +
  `      transformOptions,\n` +
  `      fileBuffer,\n` +
  `    );`;

const bundlerFiles = findFiles(PNPM_STORE, 'node_modules/metro/src/Bundler.js');
console.log('[SDK56 compat] metro Bundler.js candidates:', bundlerFiles.length);
for (const f of bundlerFiles) {
  patchFile(f, SENTINEL_BUNDLER_INIT, [
    [BUNDLER_CATCH_FROM, BUNDLER_CATCH_TO],
    [BUNDLER_XFORM_FROM, BUNDLER_XFORM_TO],
  ]);
}

console.log('[SDK56 compat] Done.');
