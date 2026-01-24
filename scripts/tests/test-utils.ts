/**
 * Shared utilities for end-to-end tests
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
export function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    return true;
  } catch (e) {
    console.error('Could not load .env.local');
    return false;
  }
}

// Test result tracking
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export class TestRunner {
  private results: TestResult[] = [];
  private suiteName: string;

  constructor(suiteName: string) {
    this.suiteName = suiteName;
  }

  async run(testName: string, testFn: () => Promise<void>) {
    const start = Date.now();
    try {
      await testFn();
      this.results.push({
        name: testName,
        passed: true,
        duration: Date.now() - start
      });
      console.log(`  ✓ ${testName} (${Date.now() - start}ms)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({
        name: testName,
        passed: false,
        error: errorMessage,
        duration: Date.now() - start
      });
      console.log(`  ✗ ${testName} (${Date.now() - start}ms)`);
      console.log(`    Error: ${errorMessage}`);
    }
  }

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(50));
    console.log(`${this.suiteName} Results: ${passed}/${total} passed`);
    if (failed > 0) {
      console.log(`\nFailed tests:`);
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    console.log('='.repeat(50));

    return { passed, failed, total };
  }
}

// Assertion helpers
export function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

export function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

export function assertArrayLength(arr: any[], expectedLength: number, message?: string) {
  if (arr.length !== expectedLength) {
    throw new Error(message || `Expected array length ${expectedLength} but got ${arr.length}`);
  }
}

export function assertArrayNotEmpty(arr: any[], message?: string) {
  if (arr.length === 0) {
    throw new Error(message || 'Expected array to not be empty');
  }
}
