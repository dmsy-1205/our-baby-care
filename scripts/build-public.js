'use strict';

const fs = require('fs');
const path = require('path');

const workspace = path.resolve(__dirname, '..');
const output = path.resolve(workspace, 'public');
const expectedOutput = `${workspace}${path.sep}public`;

if (output !== expectedOutput || path.dirname(output) !== workspace) {
  throw new Error(`Unsafe public output path: ${output}`);
}

const rootFiles = [
  'index.html',
  'admin.html',
  '404.html',
  'offline.html',
  'manifest.webmanifest',
  'service-worker.js'
];

const trees = [
  { name: 'js', extensions: new Set(['.js']) },
  { name: 'css', extensions: new Set(['.css']) },
  { name: 'admin', extensions: new Set(['.js', '.css']) },
  { name: 'assets', extensions: new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']) }
];

function copyFile(relativePath) {
  const source = path.resolve(workspace, relativePath);
  const destination = path.resolve(output, relativePath);
  if (!source.startsWith(`${workspace}${path.sep}`) || !destination.startsWith(`${output}${path.sep}`)) {
    throw new Error(`Unsafe copy path: ${relativePath}`);
  }
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Required public file is missing: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyTree(tree) {
  const sourceRoot = path.resolve(workspace, tree.name);
  if (!fs.existsSync(sourceRoot)) throw new Error(`Required public directory is missing: ${tree.name}`);

  const visit = (directory) => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return visit(absolute);
      if (!entry.isFile() || !tree.extensions.has(path.extname(entry.name).toLowerCase())) return;
      copyFile(path.relative(workspace, absolute));
    });
  };
  visit(sourceRoot);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
rootFiles.forEach(copyFile);
trees.forEach(copyTree);

const requiredOutputs = [
  'index.html', 'admin.html', 'service-worker.js', 'manifest.webmanifest',
  'js/config.js', 'js/moments.js', 'css/style.css', 'admin/admin-bootstrap.js'
];
requiredOutputs.forEach((relativePath) => {
  if (!fs.existsSync(path.join(output, relativePath))) {
    throw new Error(`Public build validation failed: ${relativePath}`);
  }
});

const files = [];
const collect = (directory) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (entry.isFile()) files.push(path.relative(output, absolute));
  });
};
collect(output);

console.log(`[HearMe2nite] public whitelist build complete: ${files.length} files`);

