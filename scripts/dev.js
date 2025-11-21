#!/usr/bin/env node

const detectPort = require('detect-port');
const { spawn } = require('child_process');

async function main() {
  const preferredPort = Number(process.env.PORT) || 3000;
  const availablePort = await detectPort(preferredPort);

  if (availablePort !== preferredPort) {
    console.log(
      `[moneta] Port ${preferredPort} is in use. Switching to available port ${availablePort}.`
    );
  }

  const nextArgs = ['dev', '-p', String(availablePort)];
  const child = spawn(getNextCommand(), nextArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(availablePort),
    },
    shell: false,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function getNextCommand() {
  return process.platform === 'win32' ? 'next.cmd' : 'next';
}

main().catch((error) => {
  console.error('[moneta] Failed to start Next.js dev server:', error);
  process.exit(1);
});




