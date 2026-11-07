/**
 * TrustVault - CLI Security Test Runner
 * Run via: npm test
 */

import { initDatabase } from '../server/db/database.ts';
import { seedUsers } from '../server/services/authService.ts';
import { runAllSecurityTests } from '../server/services/securityTestRunner.ts';

async function main() {
  console.log('===========================================================');
  console.log('   TRUSTVAULT SECURE DOCUMENT SHARING PLATFORM');
  console.log('   Automated Security & Authorization Test Suite');
  console.log('===========================================================\n');

  initDatabase();
  await seedUsers();

  const report = await runAllSecurityTests();

  console.log(`Executed: ${report.totalTests} Security Test Scenarios`);
  console.log(`Passed:   ${report.passedCount}`);
  console.log(`Failed:   ${report.failedCount}\n`);

  for (const t of report.tests) {
    const symbol = t.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${symbol}] Test #${t.id}: ${t.name} (${t.executionTimeMs}ms)`);
    console.log(`        Category: ${t.category}`);
    console.log(`        Detail:   ${t.message}\n`);
  }

  if (report.allPassed) {
    console.log('===========================================================');
    console.log('   ALL 18 MANDATORY SECURITY TESTS PASSED SUCCESSFULLY!    ');
    console.log('===========================================================');
    process.exit(0);
  } else {
    console.error('CRITICAL: Some security tests failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Security test runner encountered fatal error:', err);
  process.exit(1);
});
