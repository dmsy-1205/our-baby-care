'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssDirectory = path.join(root, 'css');
const sourceName = 'style.layer-05.css';
const sourcePath = path.join(cssDirectory, sourceName);
const manifestPath = path.join(cssDirectory, 'style.layers.json');
const entryPath = path.join(cssDirectory, 'style.css');
const sections = [
  { name: 'components/app-shell.css', marker: '/* STEP6.2.14.20 - app-frame modal width contract.' },
  { name: 'screens/records.css', marker: '/* STEP6.2.14.28 - theme-aware selected-date record status. */' },
  { name: 'components/app-shell-layout.css', marker: '@media(min-width:1181px){' },
  { name: 'components/modal.css', marker: '/* STEP6.2.14.21 - floating modal depth.' },
  { name: 'components/card.css', marker: '/* STEP6.2.14.22 - native-app floating cards.' },
  { name: 'components/modal-theme.css', marker: '/* STEP6.2.14.23 - override the display-mode overlay tint at equal specificity. */' }
];

sections.forEach(({ name }) => {
  if (fs.existsSync(path.join(cssDirectory, name))) {
    throw new Error(`CSS output already exists; refusing to overwrite: ${name}`);
  }
});

const source = fs.readFileSync(sourcePath);
let searchOffset = 0;
const offsets = sections.map(({ marker }) => {
  const offset = source.indexOf(Buffer.from(marker), searchOffset);
  if (offset >= 0) searchOffset = offset + Buffer.byteLength(marker);
  return offset;
});
if (offsets.some((offset) => offset < 0) || offsets.some((offset, index) => index && offset <= offsets[index - 1])) {
  throw new Error('Expected app-shell CSS boundaries were not found in order.');
}

const prefix = source.subarray(0, offsets[0]);
const outputs = sections.map((section, index) => ({
  name: section.name,
  content: source.subarray(offsets[index], offsets[index + 1] ?? source.length)
}));
const reconstructed = Buffer.concat([prefix, ...outputs.map(({ content }) => content)]);
if (!source.equals(reconstructed)) throw new Error('CSS byte order changed during app-shell split.');

fs.writeFileSync(sourcePath, prefix);
outputs.forEach(({ name, content }) => {
  const outputPath = path.join(cssDirectory, name);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
});

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const names = manifest.layers.map((layer) => layer.name);
const sourceIndex = names.indexOf(sourceName);
if (sourceIndex < 0) throw new Error(`${sourceName} is missing from the manifest.`);
names.splice(sourceIndex + 1, 0, ...outputs.map(({ name }) => name));

const describe = (name) => {
  const content = fs.readFileSync(path.join(cssDirectory, name));
  return { name, bytes: content.length, lines: content.toString('utf8').split(/\r?\n/).length };
};
manifest.layers = names.map(describe);
const combined = Buffer.concat(names.map((name) => fs.readFileSync(path.join(cssDirectory, name))));
manifest.sourceHash = crypto.createHash('sha256').update(combined).digest('hex');
manifest.sourceBytes = combined.length;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const entry = [
  '/* HearMe2nite CSS cascade entry. Keep this import order unchanged. */',
  ...names.map((name) => `@import url("./${name.replace(/\\/g, '/')}");`),
  ''
].join('\n');
fs.writeFileSync(entryPath, entry, 'utf8');
console.log(`[HearMe2nite] app-shell CSS split preserved ${combined.length} ordered bytes`);
