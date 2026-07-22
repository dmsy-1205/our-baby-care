'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const files = ['admin.html'];

function collect(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.isFile()) files.push(path.relative(root, full).replace(/\\/g, '/'));
  });
}

collect(path.join(root, 'admin'));
files.sort();
const hashes = Object.fromEntries(files.map((relativePath) => {
  const content = fs.readFileSync(path.join(root, relativePath));
  return [relativePath, crypto.createHash('sha256').update(content).digest('hex')];
}));

const output = {
  frozenAtVersion: 'STEP6.2.14.44',
  purpose: 'Admin app is frozen. Update only after explicit administrator-app approval.',
  algorithm: 'sha256',
  hashes
};
fs.writeFileSync(path.join(__dirname, 'admin-freeze.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`[HearMe2nite] locked ${files.length} admin files`);
