
import { runExtendedTests } from './extended-tests';
import { cleanupTestData } from './utils/test-client';

async function main() {
    console.log('Running Extended Tests Only...');
    const result = await runExtendedTests();
    console.log('Results:', result);
    // await cleanupTestData();
}

main().catch(console.error);
