'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssDirectory = path.join(root, 'css');
const sourcePath = path.join(cssDirectory, 'style.layer-05.css');
const topBarPath = path.join(cssDirectory, 'components', 'top-bar.css');
const homePath = path.join(cssDirectory, 'screens', 'home.css');
const manifestPath = path.join(cssDirectory, 'style.layers.json');
const entryPath = path.join(cssDirectory, 'style.css');

if (fs.existsSync(topBarPath) || fs.existsSync(homePath)) {
  throw new Error('Component CSS output already exists; refusing to overwrite it.');
}

const source = fs.readFileSync(sourcePath);
const topBarMarker = Buffer.from('/* STEP6.2.14.24 - themed mission/water controls and compact app header. */');
const homeMarker = Buffer.from(':root[data-hm-theme] .hm-adaptive-live-list');
const topBarStart = source.indexOf(topBarMarker);
const homeStart = source.indexOf(homeMarker, topBarStart);

if (topBarStart < 0 || homeStart < 0 || homeStart <= topBarStart) {
  throw new Error('Expected CSS component boundaries were not found in order.');
}

const prefix = source.subarray(0, topBarStart);
const topBar = source.subarray(topBarStart, homeStart);
const home = source.subarray(homeStart);
const reconstructed = Buffer.concat([prefix, topBar, home]);

if (!source.equals(reconstructed)) {
  throw new Error('CSS byte order changed during component split.');
}

fs.mkdirSync(path.dirname(topBarPath), { recursive: true });
fs.mkdirSync(path.dirname(homePath), { recursive: true });
fs.writeFileSync(sourcePath, prefix);
fs.writeFileSync(topBarPath, topBar);
fs.writeFileSync(homePath, home);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const layerNames = manifest.layers.map((layer) => layer.name);
const sourceIndex = layerNames.indexOf('style.layer-05.css');
if (sourceIndex < 0) throw new Error('style.layer-05.css is missing from the manifest.');
layerNames.splice(sourceIndex + 1, 0, 'components/top-bar.css', 'screens/home.css');

const describe = (name) => {
  const content = fs.readFileSync(path.join(cssDirectory, name));
  return {
    name,
    bytes: content.length,
    lines: content.toString('utf8').split(/\r?\n/).length
  };
};
const layers = layerNames.map(describe);
const combined = Buffer.concat(layerNames.map((name) => fs.readFileSync(path.join(cssDirectory, name))));
manifest.sourceHash = crypto.createHash('sha256').update(combined).digest('hex');
manifest.sourceBytes = combined.length;
manifest.layers = layers;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const entry = [
  '/* HearMe2nite CSS cascade entry. Keep this import order unchanged. */',
  ...layerNames.map((name) => `@import url("./${name.replace(/\\/g, '/')}");`),
  ''
].join('\n');
fs.writeFileSync(entryPath, entry, 'utf8');

console.log(`[HearMe2nite] component CSS split preserved ${combined.length} ordered bytes`);
