'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const cssDirectory = path.join(root, 'css');
const entryFile = path.join(cssDirectory, 'style.css');
const source = fs.readFileSync(entryFile, 'utf8');

if (/^@import url\("\.\/style\.layer-/m.test(source)) {
  throw new Error('style.css is already split. Restore the source before running this tool again.');
}

const desiredCuts = [3800, 6900, 10000, 12500];
const safeOffsets = [];
let line = 1;
let depth = 0;
let quote = '';
let inComment = false;
let escaped = false;
let nextCut = 0;

for (let index = 0; index < source.length; index += 1) {
  const char = source[index];
  const following = source[index + 1] || '';

  if (inComment) {
    if (char === '*' && following === '/') {
      inComment = false;
      index += 1;
    }
    if (char === '\n') line += 1;
    continue;
  }
  if (quote) {
    if (escaped) escaped = false;
    else if (char === '\\') escaped = true;
    else if (char === quote) quote = '';
    if (char === '\n') line += 1;
    continue;
  }
  if (char === '/' && following === '*') {
    inComment = true;
    index += 1;
    continue;
  }
  if (char === '"' || char === "'") {
    quote = char;
    continue;
  }
  if (char === '{') depth += 1;
  else if (char === '}') depth -= 1;
  if (depth < 0) throw new Error(`Invalid CSS brace balance near line ${line}`);

  if (char === '\n') {
    line += 1;
    if (nextCut < desiredCuts.length && line >= desiredCuts[nextCut] && depth === 0) {
      safeOffsets.push(index + 1);
      nextCut += 1;
    }
  }
}

if (depth !== 0 || inComment || quote) throw new Error('CSS ended inside an open rule, comment, or string.');
if (safeOffsets.length !== desiredCuts.length) throw new Error('Could not find all safe split positions.');

const offsets = [0, ...safeOffsets, source.length];
const layerFiles = offsets.slice(0, -1).map((start, index) => {
  const name = `style.layer-${String(index + 1).padStart(2, '0')}.css`;
  const content = source.slice(start, offsets[index + 1]);
  fs.writeFileSync(path.join(cssDirectory, name), content, 'utf8');
  return { name, bytes: Buffer.byteLength(content), lines: content.split(/\r?\n/).length };
});

const entry = [
  '/* HearMe2nite CSS cascade entry. Keep this import order unchanged. */',
  ...layerFiles.map(({ name }) => `@import url("./${name}");`),
  ''
].join('\n');
fs.writeFileSync(entryFile, entry, 'utf8');

const manifest = {
  algorithm: 'sha256',
  sourceHash: crypto.createHash('sha256').update(source).digest('hex'),
  sourceBytes: Buffer.byteLength(source),
  layers: layerFiles
};
fs.writeFileSync(path.join(cssDirectory, 'style.layers.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[HearMe2nite] CSS split into ${layerFiles.length} ordered layers; source hash ${manifest.sourceHash}`);
