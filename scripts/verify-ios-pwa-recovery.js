'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));
const index = read('index.html');
const release = read('js/release-info.js');
const pwa = read('js/pwa.js');
const worker = read('service-worker.js');
const categories = read('css/screens/category-routes.css');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(manifest.start_url === '/index.html?source=pwa&v=step6-2-14-89', 'manifest start URL');
check(/step:\s*'STEP6\.2\.14\.89'/.test(release), 'release step');
check(/HM_PWA_VERSION\s*=\s*'v1\.0-step6-2-14-89'/.test(worker), 'service-worker cache version');
check(/css\/style\.css\?v=step6-2-14-89-device-layout-20260724/.test(index), 'stylesheet cache key');
check(/js\/pwa\.js\?v=step6-2-14-89-device-layout-20260724/.test(index), 'PWA script cache key');
check(/function revalidateCurrentStyleAssets\(\)/.test(pwa), 'style revalidation helper');
check(/cache:\s*'reload'/.test(pwa), 'reload cache mode');
check(/await revalidateCurrentStyleAssets\(\)/.test(pwa), 'style revalidation after cache cleanup');
check(!/(?:location|window\.location)\.reload\s*\(/.test(pwa), 'no forced page reload');
check(/hm-adaptive-category strong[\s\S]{0,260}-webkit-text-fill-color/.test(categories), 'iOS dark title color');
check(/hm-adaptive-category small[\s\S]{0,260}-webkit-text-fill-color/.test(categories), 'iOS dark support color');

if (failures.length) {
  failures.forEach((failure) => console.error(`[FAIL] ${failure}`));
  console.error(`[IOS PWA RECOVERY] ${failures.length} checks failed`);
  process.exit(1);
}

console.log('[IOS PWA RECOVERY] 11 checks passed');
