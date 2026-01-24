/**
 * Master test runner - runs all end-to-end tests
 *
 * Run with: npx tsx scripts/tests/run-all-tests.ts
 */

import { spawn } from 'child_process';
import { resolve as pathResolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = pathResolve(__dirname, '../..');

const tests = [
  { name: 'Library Management', file: 'test-library.ts' },
  { name: 'Tags Management', file: 'test-tags.ts' },
  { name: 'Custom Lists', file: 'test-custom-lists.ts' },
  { name: 'Notifications', file: 'test-notifications.ts' },
  { name: 'Streaming Services', file: 'test-streaming-services.ts' },
  { name: 'Friend Sharing', file: '../test-friend-sharing.ts' },
  { name: 'Collaborative Lists', file: 'test-collaborative-lists.ts' },
];

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
}

async function runTest(name: string, file: string): Promise<TestResult> {
  return new Promise((promiseResolve) => {
    const testPath = `${__dirname}/${file}`;
    const childProcess = spawn('npx', ['tsx', testPath], {
      cwd: projectRoot,
      shell: true,
    });

    let output = '';

    childProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    childProcess.on('close', (code) => {
      // Check if output contains failure indicators
      const hasFailures = output.includes('✗') || output.includes('Error:') || code !== 0;
      promiseResolve({
        name,
        passed: !hasFailures,
        output,
      });
    });

    childProcess.on('error', (err) => {
      promiseResolve({
        name,
        passed: false,
        output: `Failed to run test: ${err.message}`,
      });
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              FlickLog End-to-End Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Running: ${test.name}`);
    console.log('─'.repeat(60));

    const result = await runTest(test.name, test.file);
    results.push(result);

    // Show condensed output
    const lines = result.output.split('\n');
    for (const line of lines) {
      if (line.includes('✓') || line.includes('✗') || line.includes('Results:')) {
        console.log(line);
      }
    }
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      FINAL SUMMARY                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`║ ${statusColor}${status}\x1b[0m  ${result.name.padEnd(48)}║`);
  }

  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Total: ${passed.length}/${results.length} test suites passed`.padEnd(61) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (failed.length > 0) {
    console.log('\n\x1b[31mFailed test details:\x1b[0m');
    for (const result of failed) {
      console.log(`\n--- ${result.name} ---`);
      console.log(result.output);
    }
    process.exit(1);
  }

  console.log('\n\x1b[32mAll test suites passed!\x1b[0m');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
