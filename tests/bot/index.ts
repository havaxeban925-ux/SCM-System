/**
 * SCM 自动化测试机器人
 * 
 * 用法:
 *   npm run test              # 运行所有测试
 *   npm run test:style        # 只运行款式问题测试
 *   npm run test:pricing      # 只运行核价问题测试
 *   npm run test:anomaly      # 只运行异常问题测试
 *   npm run test:restock      # 只运行大货问题测试
 */

import { TestRunner } from './runner.js';
import { reporter } from './reporter.js';
import { styleTests } from './scenarios/style.js';
import { pricingTests } from './scenarios/pricing.js';
import { anomalyTests } from './scenarios/anomaly.js';
import { restockTests } from './scenarios/restock.js';
import { api } from './api-client.js';

// 解析命令行参数
function parseArgs(): { module?: string } {
    const args = process.argv.slice(2);
    const result: { module?: string } = {};

    for (const arg of args) {
        if (arg.startsWith('--module=')) {
            result.module = arg.split('=')[1];
        }
    }

    return result;
}

async function main() {
    const { module } = parseArgs();
    const runner = new TestRunner();

    // 健康检查
    console.log('正在检查 API 服务器...');
    try {
        await api.healthCheck();
        console.log('✅ API 服务器连接成功\n');
    } catch (err) {
        console.error('❌ 无法连接 API 服务器，请确保后端已启动');
        console.error('   运行: npm run server\n');
        process.exit(1);
    }

    reporter.start();

    // 根据参数选择测试模块
    const allTests = [];

    if (!module || module === 'style') {
        allTests.push(...styleTests);
    }
    if (!module || module === 'pricing') {
        allTests.push(...pricingTests);
    }
    if (!module || module === 'anomaly') {
        allTests.push(...anomalyTests);
    }
    if (!module || module === 'restock') {
        allTests.push(...restockTests);
    }

    // 运行测试
    for (const test of allTests) {
        const result = await runner.runTest(test);
        reporter.logTest(result);
    }

    // 输出汇总
    reporter.summary(runner.getResults());

    // 返回退出码
    const failed = runner.getFailedCount();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('测试机器人执行出错:', err);
    process.exit(1);
});
