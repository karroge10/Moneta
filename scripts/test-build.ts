#!/usr/bin/env tsx

/**
 * Test script to verify TypeScript compilation
 * This checks the same TypeScript errors that Vercel's build process will catch
 */

import { execSync } from 'child_process';

console.log('🔍 Testing TypeScript compilation...\n');

try {
  // Run TypeScript type check (same as Vercel does)
  console.log('Running TypeScript type check...');
  execSync('npx tsc --noEmit', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('\n✅ TypeScript check passed! Build should succeed on Vercel.\n');
  process.exit(0);
} catch (error: any) {
  console.error('\n❌ TypeScript check failed:');
  if (error.stdout) {
    console.error(error.stdout.toString());
  }
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
  process.exit(1);
}

