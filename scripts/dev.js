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

  const child = spawn(getNextCommand(), getNextArgs(availablePort), {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(availablePort),
    },
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function getNextCommand() {
  // With shell: true, we can use 'npx next' which works cross-platform
  return 'npx';
}

function getNextArgs(port) {
  return ['next', 'dev', '-p', String(port)];
}

main().catch((error) => {
  console.error('[moneta] Failed to start Next.js dev server:', error);
  process.exit(1);
});




