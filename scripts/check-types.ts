#!/usr/bin/env tsx
/**
 * Type checking script to find implicit 'any' types
 * 
 * Usage: npx tsx scripts/check-types.ts
 * 
 * This script runs TypeScript compiler with strict mode
 * to catch all implicit any types and other type errors.
 */

import { execSync } from 'child_process';

console.log('🔍 Checking for implicit any types and type errors...\n');

try {
  // Run TypeScript compiler with noEmit to check types without building
  execSync('npx tsc --noEmit --pretty', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('\n✅ No type errors found!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Type errors found. Please fix them before committing.');
  process.exit(1);
}

