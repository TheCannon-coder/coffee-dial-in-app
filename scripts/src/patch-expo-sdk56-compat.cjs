/**
 * Patches @expo/cli and @expo/metro-config for Expo SDK 56 + Metro 0.84 compatibility.
 *
 * Root cause: Metro 0.84's IncrementalBundler.getBundler() can return undefined in
 * certain init sequences. Two call sites in @expo/cli call
 * `.getBundler().getBundler()` without null-checking the result and then access
 * `.transformFile` on it, crashing with:
 *   "Cannot read properties of undefined (reading 'transformFile')"
 *
 * pnpm's patchedDependencies mechanism is not applied by EAS Build (it skips the
 * workspace-root install step), so we patch the files directly here via postinstall.
 *
 * Patches applied (idempotent):
 *   1. @expo/metro-config  build/serializer/packedMap.js
 *      patchTransformFileForPackedMaps() — guard undefined bundler argument
 *   2. @expo/cli  build/src/start/server/metro/instantiateMetro.js
 *      Direct .transformFile.bind() call — guard undefined inner bundler
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SENTINEL_1 = '/* SDK56_COMPAT_PATCH_1 */';
const SENTINEL_2 = '/* SDK56_COMPAT_PATCH_2 */';

function patch(filePath, fromStr, toStr, sentinel) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  if (content.includes(sentinel)) return; // already patched
  if (!content.includes(fromStr)) {
    console.warn('[SDK56 compat] Pattern not found, skipping:', filePath);
    return;
  }
  fs.writeFileSync(filePath, content.replace(fromStr, toStr), 'utf8');
  console.log('[SDK56 compat] Patched:', filePath);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findFiles(baseDir, relPath) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;
  for (const entry of fs.readdirSync(baseDir)) {
    const candidate = path.join(baseDir, entry, relPath);
    if (fs.existsSync(candidate)) results.push(candidate);
  }
  return results;
}

// Support two calling conventions:
// 1. As a postinstall (CWD = workspace root, __dirname = scripts/src)
// 2. As an EAS custom build step (CWD = workspace root / checkout dir)
const PNPM_STORE = (function () {
  // Prefer CWD-relative path (works in both EAS build step and postinstall)
  const cwdBased = path.resolve(process.cwd(), 'node_modules/.pnpm');
  if (fs.existsSync(cwdBased)) return cwdBased;
  // Fallback: relative to this script file (scripts/src/ → workspace root)
  return path.resolve(__dirname, '../../node_modules/.pnpm');
}());

// ── Patch 1: packedMap.js ─────────────────────────────────────────────────────
// Add guard so patchTransformFileForPackedMaps() is a safe no-op when the
// Metro inner bundler is undefined (Metro 0.84+ init-sequence change).

const PACKED_MAP_FROM =
  'function patchTransformFileForPackedMaps(bundler) {\n' +
  '    const originalTransformFile = bundler.transformFile.bind(bundler);';

const PACKED_MAP_TO =
  `function patchTransformFileForPackedMaps(bundler) {\n` +
  `    ${SENTINEL_1}\n` +
  `    if (!bundler || typeof bundler.transformFile !== 'function') return;\n` +
  `    const originalTransformFile = bundler.transformFile.bind(bundler);`;

for (const f of findFiles(PNPM_STORE, 'node_modules/@expo/metro-config/build/serializer/packedMap.js')) {
  patch(f, PACKED_MAP_FROM, PACKED_MAP_TO, SENTINEL_1);
}

// ── Patch 2: instantiateMetro.js ──────────────────────────────────────────────
// Guard the direct metro.getBundler().getBundler().transformFile.bind() call that
// is NOT inside patchTransformFileForPackedMaps and therefore not covered by
// Patch 1 above.

const INSTANTIATE_FROM =
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

const INSTANTIATE_TO =
  `    // Patch transform file to remove inconvenient customTransformOptions which are only used in single well-known files.\n` +
  `    ${SENTINEL_2}\n` +
  `    const _innerBundler = metro.getBundler() && typeof metro.getBundler().getBundler === 'function' && metro.getBundler().getBundler();\n` +
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
  `    (0, _packedMap().patchTransformFileForPackedMaps)(_innerBundler || metro.getBundler() && metro.getBundler().getBundler && metro.getBundler().getBundler());`;

for (const f of findFiles(PNPM_STORE, 'node_modules/@expo/cli/build/src/start/server/metro/instantiateMetro.js')) {
  patch(f, INSTANTIATE_FROM, INSTANTIATE_TO, SENTINEL_2);
}

console.log('[SDK56 compat] Done.');
