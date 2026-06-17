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
 * This script is a postinstall fallback. pnpm patchedDependencies is the primary
 * fix (patches/@expo__cli@56.1.16.patch). This script applies if the pnpm patch
 * somehow didn't take (idempotent via sentinel markers).
 *
 * Note: @expo/metro-config's packedMap.js already has a null-check in v56.0.14+.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SENTINEL_PATCH   = '/* SDK56_COMPAT_PATCH */';
const SENTINEL_VIRTUAL = '/* SDK56_COMPAT_VIRTUAL */';

function patchFile(filePath, sentinel, replacements) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  if (content.includes(sentinel)) return;

  let modified = content;
  let anyApplied = false;
  for (const [fromStr, toStr] of replacements) {
    if (!modified.includes(fromStr)) {
      console.warn('[SDK56 compat] Pattern not found, skipping:', filePath);
    } else {
      modified = modified.replace(fromStr, toStr);
      anyApplied = true;
    }
  }
  if (anyApplied) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log('[SDK56 compat] Patched:', filePath);
  }
}

const PNPM_STORE = (function () {
  const cwdBased = path.resolve(process.cwd(), 'node_modules/.pnpm');
  if (fs.existsSync(cwdBased)) return cwdBased;
  return path.resolve(__dirname, '../../node_modules/.pnpm');
}());

function findFiles(baseDir, relPath) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;
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
  `    (0, _packedMap().patchTransformFileForPackedMaps)(_innerBundler);`;

for (const f of findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/start/server/metro/instantiateMetro.js')) {
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

for (const f of findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/start/server/metro/metroVirtualModules.js')) {
  patchFile(f, SENTINEL_VIRTUAL, [
    [VIRTUAL_FROM, VIRTUAL_TO],
  ]);
}

console.log('[SDK56 compat] Done.');
