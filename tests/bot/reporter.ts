/**
 * SCM 测试机器人 - 结果报告器
 */

import type { TestResult } from './runner.js';

// ANSI 颜色码
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

const moduleColors: Record<string, string> = {
    style: colors.blue,
    pricing: colors.magenta,
    anomaly: colors.yellow,
    restock: colors.cyan,
};

const moduleNames: Record<string, string> = {
    style: '款式问题',
    pricing: '核价问题',
    anomaly: '异常问题',
    restock: '大货问题',
};

export class Reporter {
    private startTime: number = 0;

    start(): void {
        this.startTime = Date.now();
        console.log('');
        console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}  SCM 自动化测试机器人${colors.reset}`);
        console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}`);
        console.log('');
    }

    logTest(result: TestResult): void {
        const moduleColor = moduleColors[result.module] || colors.white;
        const moduleName = moduleNames[result.module] || result.module;
        const status = result.passed
            ? `${colors.green}✅ 通过${colors.reset}`
            : `${colors.red}❌ 失败${colors.reset}`;

        const duration = `${colors.dim}(${result.duration}ms)${colors.reset}`;

        console.log(`${moduleColor}[${moduleName}]${colors.reset} ${result.name}... ${status} ${duration}`);

        if (!result.passed && result.error) {
            console.log(`  ${colors.red}└── ${result.error}${colors.reset}`);
        }
    }

    summary(results: TestResult[]): void {
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const total = results.length;
        const totalTime = Date.now() - this.startTime;

        console.log('');
        console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}`);

        if (failed === 0) {
            console.log(`${colors.green}  测试结果: ${passed}/${total} 通过 (100%) 🎉${colors.reset}`);
        } else {
            const percentage = Math.round((passed / total) * 100);
            console.log(`${colors.yellow}  测试结果: ${passed}/${total} 通过 (${percentage}%)${colors.reset}`);
            console.log(`${colors.red}  失败: ${failed} 个测试${colors.reset}`);
        }

        console.log(`${colors.dim}  总耗时: ${totalTime}ms${colors.reset}`);
        console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}`);
        console.log('');
    }

    // 按模块分组输出
    groupByModule(results: TestResult[]): void {
        const modules = ['style', 'pricing', 'anomaly', 'restock'];

        for (const module of modules) {
            const moduleResults = results.filter(r => r.module === module);
            if (moduleResults.length === 0) continue;

            console.log('');
            const moduleColor = moduleColors[module] || colors.white;
            const moduleName = moduleNames[module] || module;
            console.log(`${moduleColor}${colors.bright}▶ ${moduleName}${colors.reset}`);

            for (const result of moduleResults) {
                this.logTest(result);
            }
        }
    }
}

export const reporter = new Reporter();
