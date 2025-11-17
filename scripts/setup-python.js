#!/usr/bin/env node
/**
 * Setup script to install Python dependencies
 * Runs automatically after npm install (via postinstall hook)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const requirementsPath = path.join(__dirname, '..', 'python', 'requirements.txt');

// Check if requirements.txt exists
if (!fs.existsSync(requirementsPath)) {
  console.log('⚠️  python/requirements.txt not found, skipping Python dependency installation');
  process.exit(0);
}

// Determine Python executable
const pythonExec = process.platform === 'win32' ? 'python' : 'python3';

console.log('📦 Installing Python dependencies...');
console.log(`   Using: ${pythonExec}`);
console.log(`   Requirements: ${requirementsPath}`);

// Use absolute path and normalize for Windows - convert to forward slashes for pip
const normalizedPath = path.resolve(requirementsPath).replace(/\\/g, '/');

const pip = spawn(pythonExec, ['-m', 'pip', 'install', '-r', normalizedPath], {
  stdio: 'inherit',
  shell: false, // Don't use shell to avoid path issues
  cwd: path.join(__dirname, '..'),
});

pip.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Python dependencies installed successfully');
  } else {
    console.error(`❌ Failed to install Python dependencies (exit code: ${code})`);
    console.error('   Please run manually: pip install -r python/requirements.txt');
    // Don't fail the npm install process, just warn
    process.exit(0);
  }
});

pip.on('error', (err) => {
  console.error('❌ Error running pip:', err.message);
  console.error('   Make sure Python is installed and available in PATH');
  console.error('   Please run manually: pip install -r python/requirements.txt');
  // Don't fail the npm install process, just warn
  process.exit(0);
});

