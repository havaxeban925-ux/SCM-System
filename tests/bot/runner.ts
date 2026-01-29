/**
 * SCM 测试机器人 - 测试运行器
 */

export interface TestCase {
    name: string;
    module: 'style' | 'pricing' | 'anomaly' | 'restock';
    run: () => Promise<void>;
}

export interface TestResult {
    name: string;
    module: string;
    passed: boolean;
    duration: number;
    error?: string;
}

export class TestRunner {
    private results: TestResult[] = [];

    async runTest(test: TestCase): Promise<TestResult> {
        const startTime = Date.now();
        let passed = true;
        let error: string | undefined;

        try {
            await test.run();
        } catch (err: any) {
            passed = false;
            error = err.message || String(err);
        }

        const result: TestResult = {
            name: test.name,
            module: test.module,
            passed,
            duration: Date.now() - startTime,
            error,
        };

        this.results.push(result);
        return result;
    }

    async runTests(tests: TestCase[]): Promise<TestResult[]> {
        for (const test of tests) {
            await this.runTest(test);
        }
        return this.results;
    }

    getResults(): TestResult[] {
        return this.results;
    }

    getPassedCount(): number {
        return this.results.filter(r => r.passed).length;
    }

    getFailedCount(): number {
        return this.results.filter(r => !r.passed).length;
    }

    getTotalCount(): number {
        return this.results.length;
    }

    clear(): void {
        this.results = [];
    }
}
