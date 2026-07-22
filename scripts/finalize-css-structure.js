'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssDirectory = path.join(root, 'css');
const manifestPath = path.join(cssDirectory, 'style.layers.json');
const entryPath = path.join(cssDirectory, 'style.css');
const renames = new Map([
  ['style.layer-01.css', 'legacy/base.css'],
  ['style.layer-02.css', 'legacy/feature-foundation.css'],
  ['style.layer-02-continuation.css', 'legacy/feature-continuation.css'],
  ['style.layer-03.css', 'legacy/brand-foundation.css'],
  ['style.layer-03-continuation.css', 'legacy/brand-continuation.css'],
  ['style.layer-04.css', 'legacy/theme-foundation.css'],
  ['style.layer-04-continuation.css', 'legacy/theme-continuation.css'],
  ['style.layer-05.css', 'legacy/release-foundation.css']
]);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const oldNames = manifest.layers.map((layer) => layer.name);
const before = Buffer.concat(oldNames.map((name) => fs.readFileSync(path.join(cssDirectory, name))));
const beforeHash = crypto.createHash('sha256').update(before).digest('hex');
if (beforeHash !== manifest.sourceHash || before.length !== manifest.sourceBytes) {
  throw new Error('Current CSS does not match the locked manifest; refusing to finalize paths.');
}

for (const [from, to] of renames) {
  const source = path.join(cssDirectory, from);
  const destination = path.join(cssDirectory, to);
  if (!fs.existsSync(source)) throw new Error(`Required legacy source is missing: ${from}`);
  if (fs.existsSync(destination)) throw new Error(`Legacy destination already exists: ${to}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);
}

const names = oldNames.map((name) => renames.get(name) || name);
const describe = (name) => {
  const content = fs.readFileSync(path.join(cssDirectory, name));
  return { name, bytes: content.length, lines: content.toString('utf8').split(/\r?\n/).length };
};
manifest.layers = names.map(describe);
const after = Buffer.concat(names.map((name) => fs.readFileSync(path.join(cssDirectory, name))));
const afterHash = crypto.createHash('sha256').update(after).digest('hex');
if (!before.equals(after) || beforeHash !== afterHash) {
  throw new Error('CSS byte order changed while finalizing legacy paths.');
}
manifest.sourceHash = afterHash;
manifest.sourceBytes = after.length;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
fs.writeFileSync(entryPath, [
  '/* HearMe2nite CSS cascade entry. Keep this import order unchanged. */',
  ...names.map((name) => `@import url("./${name.replace(/\\/g, '/')}");`),
  ''
].join('\n'), 'utf8');
console.log(`[HearMe2nite] CSS structure finalized with ${names.length} ordered files; hash ${afterHash}`);
