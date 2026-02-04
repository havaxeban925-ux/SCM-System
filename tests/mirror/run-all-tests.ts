/**
 * SCM系统全量镜像测试入口
 * 
 * 执行方式: npx tsx tests/mirror/run-all-tests.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { cleanupTestData, TestResult, Issue, TestReport } from './utils/test-client';
import { runAuthTests } from './auth.mirror.test';
import { runSpuTests } from './spu.mirror.test';
import { runPricingTests } from './pricing.mirror.test';
import { runAnomalyTests } from './anomaly.mirror.test';
import { runRestockTests } from './restock.mirror.test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.join(__dirname);

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('         SCM 系统镜像测试 - 全量验证');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}\n`);

    const allResults: TestResult[] = [];
    const allIssues: Issue[] = [];

    // 模块测试列表
    const modules = [
        { name: 'M1-认证', runner: runAuthTests },
        { name: 'M2-SPU公池', runner: runSpuTests },
        { name: 'M4-核价申请', runner: runPricingTests },
        { name: 'M5-异常申请', runner: runAnomalyTests },
        { name: 'M6-补货订单', runner: runRestockTests },
    ];

    for (const mod of modules) {
        console.log(`\n▶ 测试模块: ${mod.name}`);
        console.log('─'.repeat(50));

        try {
            const { results, issues } = await mod.runner();
            allResults.push(...results);
            allIssues.push(...issues);

            // 打印模块结果
            for (const r of results) {
                const status = r.passed ? '✅' : '❌';
                console.log(`  ${status} ${r.testName} (${r.duration}ms)${r.error ? ` - ${r.error}` : ''}`);
            }
        } catch (e: any) {
            console.error(`  ❌ 模块执行异常: ${e.message}`);
            allIssues.push({
                severity: 'critical',
                module: mod.name,
                description: `模块执行异常: ${e.message}`,
                suggestion: '检查测试脚本和依赖'
            });
        }
    }

    // 统计
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;

    // 生成报告
    const report: TestReport = {
        timestamp: new Date().toISOString(),
        totalTests: allResults.length,
        passed,
        failed,
        results: allResults,
        issues: allIssues
    };

    // 保存JSON报告
    const jsonPath = path.join(REPORT_DIR, 'test-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

    // 生成Markdown报告
    const mdPath = path.join(REPORT_DIR, 'test-report.md');
    const mdContent = generateMarkdownReport(report);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    // 打印总结
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                      测试总结');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`总测试数: ${allResults.length}`);
    console.log(`通过: ${passed} ✅`);
    console.log(`失败: ${failed} ❌`);
    console.log(`发现问题: ${allIssues.length}`);
    console.log(`\n报告已生成:`);
    console.log(`  - ${jsonPath}`);
    console.log(`  - ${mdPath}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // 如果有失败，退出码为1
    process.exit(failed > 0 ? 1 : 0);
}

function generateMarkdownReport(report: TestReport): string {
    const lines: string[] = [];

    lines.push('# SCM系统镜像测试报告');
    lines.push('');
    lines.push(`> 测试时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}`);
    lines.push('');

    // 总览
    lines.push('## 📊 测试总览');
    lines.push('');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 总测试数 | ${report.totalTests} |`);
    lines.push(`| 通过 | ${report.passed} ✅ |`);
    lines.push(`| 失败 | ${report.failed} ❌ |`);
    lines.push(`| 通过率 | ${((report.passed / report.totalTests) * 100).toFixed(1)}% |`);
    lines.push('');

    // 按模块分组结果
    lines.push('## 📋 模块测试详情');
    lines.push('');

    const byModule = new Map<string, TestResult[]>();
    for (const r of report.results) {
        if (!byModule.has(r.module)) byModule.set(r.module, []);
        byModule.get(r.module)!.push(r);
    }

    for (const [module, results] of byModule) {
        const modulePassed = results.filter(r => r.passed).length;
        const moduleTotal = results.length;
        const status = modulePassed === moduleTotal ? '✅' : '⚠️';

        lines.push(`### ${status} ${module} (${modulePassed}/${moduleTotal})`);
        lines.push('');
        lines.push('| 测试项 | 状态 | 耗时 | 错误信息 |');
        lines.push('|--------|------|------|----------|');

        for (const r of results) {
            const s = r.passed ? '✅ PASS' : '❌ FAIL';
            const err = r.error ? r.error.substring(0, 50) : '-';
            lines.push(`| ${r.testName} | ${s} | ${r.duration}ms | ${err} |`);
        }
        lines.push('');
    }

    // 问题清单
    if (report.issues.length > 0) {
        lines.push('## ⚠️ 发现的问题');
        lines.push('');

        const critical = report.issues.filter(i => i.severity === 'critical');
        const major = report.issues.filter(i => i.severity === 'major');
        const minor = report.issues.filter(i => i.severity === 'minor');

        if (critical.length > 0) {
            lines.push('### 🔴 严重问题 (Critical)');
            lines.push('');
            for (const issue of critical) {
                lines.push(`- **[${issue.module}]** ${issue.description}`);
                if (issue.suggestion) lines.push(`  - 建议: ${issue.suggestion}`);
            }
            lines.push('');
        }

        if (major.length > 0) {
            lines.push('### 🟠 重要问题 (Major)');
            lines.push('');
            for (const issue of major) {
                lines.push(`- **[${issue.module}]** ${issue.description}`);
                if (issue.suggestion) lines.push(`  - 建议: ${issue.suggestion}`);
            }
            lines.push('');
        }

        if (minor.length > 0) {
            lines.push('### 🟡 轻微问题 (Minor)');
            lines.push('');
            for (const issue of minor) {
                lines.push(`- **[${issue.module}]** ${issue.description}`);
                if (issue.suggestion) lines.push(`  - 建议: ${issue.suggestion}`);
            }
            lines.push('');
        }
    } else {
        lines.push('## ✅ 未发现问题');
        lines.push('');
        lines.push('所有测试通过，未发现需要修复的问题。');
        lines.push('');
    }

    // 建议
    lines.push('## 💡 后续建议');
    lines.push('');
    lines.push('1. 对于失败的测试，请检查对应的API端点和数据库连接');
    lines.push('2. 对于已知问题（如b_quote_order写入），建议在Schema同步后恢复相关逻辑');
    lines.push('3. 建议将此测试集成到CI/CD流程中');
    lines.push('');

    return lines.join('\n');
}

main().catch(console.error);
