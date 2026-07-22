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
  'js/config.js', 'js/access-policy.js', 'js/save-state.js', 'js/ui-events.js', 'js/moments.js', 'js/card-conversations.js', 'css/style.css',
  'css/tokens.css', 'css/legacy/base.css', 'css/legacy/release-foundation.css',
  'css/components/app-shell.css', 'css/components/app-shell-layout.css', 'css/components/top-bar.css',
  'css/components/app-shell-responsive.css', 'css/components/modal.css', 'css/components/modal-theme.css',
  'css/components/modal-surfaces.css', 'css/components/modal-foundation.css',
  'css/components/card.css', 'css/components/card-foundation.css',
  'css/components/input.css', 'css/components/button.css',
  'css/screens/home.css', 'css/screens/home-layout.css', 'css/screens/home-categories.css',
  'css/screens/category-routes.css', 'css/screens/missions.css', 'css/screens/daily.css',
  'css/screens/records.css', 'css/screens/records-theme.css', 'css/screens/records-gallery.css',
  'css/screens/settings-data.css', 'css/screens/settings-account.css',
  'css/screens/settings-data-requests.css', 'css/screens/relationship.css', 'admin/admin-bootstrap.js'
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
