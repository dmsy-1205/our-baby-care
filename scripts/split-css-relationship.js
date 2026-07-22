'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssDirectory = path.join(root, 'css');
const sourceName = 'style.layer-04.css';
const sourcePath = path.join(cssDirectory, sourceName);
const relationshipName = 'screens/relationship.css';
const continuationName = 'style.layer-04-continuation.css';
const manifestPath = path.join(cssDirectory, 'style.layers.json');
const entryPath = path.join(cssDirectory, 'style.css');

[relationshipName, continuationName].forEach((name) => {
  if (fs.existsSync(path.join(cssDirectory, name))) throw new Error(`CSS output already exists: ${name}`);
});

const source = fs.readFileSync(sourcePath);
const relationshipMarkerText = ':root[data-hm-theme][data-hm-display="dark"] :is(\r\n  .room-settings-modal .sync-box';
let relationshipMarker = Buffer.from(relationshipMarkerText);
const continuationMarker = Buffer.from('/* =========================================================\r\n   STEP5.10.8 - Sub routine structured inputs + History polish');
let relationshipStart = source.indexOf(relationshipMarker);
if (relationshipStart < 0) {
  relationshipMarker = Buffer.from(relationshipMarkerText.replace(/\r\n/g, '\n'));
  relationshipStart = source.indexOf(relationshipMarker);
}
let continuationStart = source.indexOf(continuationMarker, relationshipStart);
if (continuationStart < 0) {
  continuationStart = source.indexOf(Buffer.from(continuationMarker.toString().replace(/\r\n/g, '\n')), relationshipStart);
}
if (relationshipStart < 0 || continuationStart <= relationshipStart) {
  throw new Error('Expected relationship CSS boundaries were not found in order.');
}

const prefix = source.subarray(0, relationshipStart);
const relationship = source.subarray(relationshipStart, continuationStart);
const continuation = source.subarray(continuationStart);
if (!source.equals(Buffer.concat([prefix, relationship, continuation]))) {
  throw new Error('CSS byte order changed during relationship split.');
}

fs.writeFileSync(sourcePath, prefix);
for (const [name, content] of [[relationshipName, relationship], [continuationName, continuation]]) {
  const outputPath = path.join(cssDirectory, name);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const names = manifest.layers.map((layer) => layer.name);
const sourceIndex = names.indexOf(sourceName);
if (sourceIndex < 0) throw new Error(`${sourceName} is missing from the manifest.`);
names.splice(sourceIndex + 1, 0, relationshipName, continuationName);
const describe = (name) => {
  const content = fs.readFileSync(path.join(cssDirectory, name));
  return { name, bytes: content.length, lines: content.toString('utf8').split(/\r?\n/).length };
};
manifest.layers = names.map(describe);
const combined = Buffer.concat(names.map((name) => fs.readFileSync(path.join(cssDirectory, name))));
manifest.sourceHash = crypto.createHash('sha256').update(combined).digest('hex');
manifest.sourceBytes = combined.length;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
fs.writeFileSync(entryPath, [
  '/* HearMe2nite CSS cascade entry. Keep this import order unchanged. */',
  ...names.map((name) => `@import url("./${name.replace(/\\/g, '/')}");`),
  ''
].join('\n'), 'utf8');
console.log(`[HearMe2nite] relationship CSS split preserved ${combined.length} ordered bytes`);
