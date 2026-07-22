'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const workspace = path.resolve(__dirname, '..');
const localRulesPath = path.join(workspace, 'database.rules.json');
const projectArgIndex = process.argv.indexOf('--project');
const project = projectArgIndex >= 0 ? String(process.argv[projectArgIndex + 1] || '') : 'test';

if (!/^[a-z0-9-]+$/.test(project)) {
  console.error('[RULE AUDIT] Invalid Firebase project alias or id.');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const firebaseCommand = isWindows ? 'firebase.cmd' : 'firebase';
const firebaseArgs = ['database:get', '/.settings/rules', '--project', project, '--pretty'];
const result = spawnSync(
  firebaseCommand,
  firebaseArgs,
  { cwd: workspace, encoding: 'utf8', shell: isWindows, windowsHide: true }
);

if (result.error || result.status !== 0) {
  console.error(`[RULE AUDIT] Unable to read deployed rules for ${project}.`);
  if (result.error?.message) console.error(`[RULE AUDIT] ${result.error.message}`);
  process.exit(1);
}

let localRules;
let deployedRules;
try {
  localRules = JSON.parse(fs.readFileSync(localRulesPath, 'utf8'));
  deployedRules = JSON.parse(result.stdout);
} catch (error) {
  console.error(`[RULE AUDIT] Rules JSON could not be parsed: ${error.message}`);
  process.exit(1);
}

function collectDifferences(localValue, deployedValue, currentPath = '$', output = []) {
  if (output.length >= 50) return output;
  const localIsObject = localValue !== null && typeof localValue === 'object';
  const deployedIsObject = deployedValue !== null && typeof deployedValue === 'object';
  if (!localIsObject || !deployedIsObject) {
    if (localValue !== deployedValue) output.push(currentPath);
    return output;
  }

  const keys = new Set([...Object.keys(localValue), ...Object.keys(deployedValue)]);
  [...keys].sort().forEach((key) => {
    if (output.length >= 50) return;
    if (!(key in localValue) || !(key in deployedValue)) output.push(`${currentPath}/${key}`);
    else collectDifferences(localValue[key], deployedValue[key], `${currentPath}/${key}`, output);
  });
  return output;
}

const differences = collectDifferences(localRules, deployedRules);
if (differences.length) {
  console.error(`[RULE AUDIT] DRIFT detected for ${project}: ${differences.length}${differences.length === 50 ? '+' : ''} differing paths.`);
  differences.slice(0, 20).forEach((rulePath) => console.error(`[RULE AUDIT] ${rulePath}`));
  console.error('[RULE AUDIT] Read-only audit only; no rules were changed or deployed.');
  process.exit(2);
}

console.log(`[RULE AUDIT] Local and deployed Realtime Database rules match for ${project}.`);
console.log('[RULE AUDIT] Read-only audit complete; no rules were changed or deployed.');
