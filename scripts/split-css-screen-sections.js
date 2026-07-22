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
  { name: 'screens/home-layout.css', marker: '/* =========================================================\r\n   HearMe2nite v1.0 STEP6.2.14 - Responsive four-area home' },
  { name: 'screens/home-categories.css', marker: '/* =========================================================\r\n   HearMe2nite v1.0 STEP6.2.14.1 - Adaptive category home' },
  { name: 'screens/category-routes.css', marker: '/* STEP6.2.14.2 - in-app full-screen category routes */' },
  { name: 'screens/missions.css', marker: '/* STEP6.2.14.5 - live mission lists, role-correct feedback, and readable completion */' },
  { name: 'components/app-shell-responsive.css', marker: '/* STEP6.2.14.8 - compact desktop shell and storage-free avatars */' },
  { name: 'components/modal-surfaces.css', marker: '/* STEP6.2.14.14 - strict light/dark surface separation.' },
  { name: 'screens/records-theme.css', marker: '/* STEP6.2.14.16 - calendar today states follow the active theme.' },
  { name: 'screens/daily.css', marker: '/* STEP6.2.14.17 - harmonized mood editor and persistent category header. */' }
];

sections.forEach(({ name }) => {
  if (fs.existsSync(path.join(cssDirectory, name))) throw new Error(`CSS output already exists: ${name}`);
});

const source = fs.readFileSync(sourcePath);
let searchOffset = 0;
const offsets = sections.map(({ marker }) => {
  let offset = source.indexOf(Buffer.from(marker), searchOffset);
  if (offset < 0 && marker.includes('\r\n')) offset = source.indexOf(Buffer.from(marker.replace(/\r\n/g, '\n')), searchOffset);
  if (offset >= 0) searchOffset = offset + 1;
  return offset;
});
if (offsets.some((offset) => offset < 0) || offsets.some((offset, index) => index && offset <= offsets[index - 1])) {
  throw new Error('Expected screen CSS boundaries were not found in order.');
}

const prefix = source.subarray(0, offsets[0]);
const outputs = sections.map((section, index) => ({
  name: section.name,
  content: source.subarray(offsets[index], offsets[index + 1] ?? source.length)
}));
if (!source.equals(Buffer.concat([prefix, ...outputs.map(({ content }) => content)]))) {
  throw new Error('CSS byte order changed during screen split.');
}

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
fs.writeFileSync(entryPath, [
  '/* HearMe2nite CSS cascade entry. Keep this import order unchanged. */',
  ...names.map((name) => `@import url("./${name.replace(/\\/g, '/')}");`),
  ''
].join('\n'), 'utf8');
console.log(`[HearMe2nite] screen CSS split preserved ${combined.length} ordered bytes`);
