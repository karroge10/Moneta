#!/usr/bin/env node
/**
 * Sets up the Python PDF service locally: creates a virtualenv at the repo
 * root (.venv) if missing and installs python-service/requirements.txt into it.
 * Opt-in, run via `npm run setup`.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.join(__dirname, '..');
const venvDir = path.join(repoRoot, '.venv');
const requirementsPath = path.join(repoRoot, 'python-service', 'requirements.txt');
const isWindows = process.platform === 'win32';

main();

function main() {
  // Vercel and CI use an externally managed Python (PEP 668); the PDF service is not needed for the Next build.
  if (process.env.VERCEL === '1' || process.env.CI === 'true') {
    console.log('Skipping Python setup (Vercel/CI, not required for the app build).');
    return;
  }

  if (!fs.existsSync(requirementsPath)) {
    console.log('python-service/requirements.txt not found, skipping Python setup.');
    return;
  }

  const venvPython = getVenvPython();
  if (!fs.existsSync(venvPython)) {
    const created = createVenv();
    if (!created) {
      console.error('Could not create .venv. Install Python 3.12 and run: python -m venv .venv');
      return;
    }
  }

  console.log(`Installing Python dependencies from ${requirementsPath}`);
  const pipArgs = ['-m', 'pip', 'install', '-r', requirementsPath];
  const install = run(venvPython, pipArgs);
  if (install.status === 0) {
    console.log('Python dependencies installed into .venv');
  } else {
    console.error(`Failed to install Python dependencies (exit code: ${install.status}).`);
    console.error(`Run manually: ${venvPython} -m pip install -r python-service/requirements.txt`);
  }
}

function createVenv() {
  const candidates = isWindows
    ? [['py', ['-3.12']], ['python', []]]
    : [['python3.12', []], ['python3', []], ['python', []]];

  for (const [command, prefixArgs] of candidates) {
    const venvArgs = [...prefixArgs, '-m', 'venv', venvDir];
    console.log(`Creating .venv with: ${command} ${venvArgs.join(' ')}`);
    const result = run(command, venvArgs);
    if (result.status === 0) {
      return true;
    }
  }
  return false;
}

function getVenvPython() {
  if (isWindows) {
    return path.join(venvDir, 'Scripts', 'python.exe');
  }
  return path.join(venvDir, 'bin', 'python');
}

function run(command, args) {
  return spawnSync(command, args, { stdio: 'inherit', shell: false, cwd: repoRoot });
}
