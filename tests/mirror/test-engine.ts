/**
 * SCM系统流程图可视化测试运行器 - 测试引擎
 * 
 * 负责测试配置验证、执行计划生成、测试执行和结果导出
 */

import type { VisualConfig, FlowchartTestCase, FlowchartTestSuite, TestResult, ExecutionPlan, ValidationRule } from './types';

export function validateConfig(config: VisualConfig): string[] {
    const errors: string[] = [];
    
    if (!config.supabaseUrl) {
        errors.push('Supabase URL 不能为空');
    } else if (!config.supabaseUrl.includes('supabase.co')) {
        errors.push('Supabase URL 格式不正确，应包含 supabase.co');
    }
    
    if (!config.supabaseKey) {
        errors.push('Supabase Key 不能为空');
    } else if (config.supabaseKey.length < 50) {
        errors.push('Supabase Key 长度不正确');
    }
    
    if (!config.apiUrl) {
        errors.push('API URL 不能为空');
    } else if (!config.apiUrl.startsWith('http')) {
        errors.push('API URL 必须以 http:// 或 https:// 开头');
    }
    
    if (config.timeout < 5000) {
        errors.push('超时时间不能小于5000毫秒');
    } else if (config.timeout > 120000) {
        errors.push('超时时间不能大于120000毫秒');
    }
    
    return errors;
}

export function generateExecutionPlan(
    suites: FlowchartTestSuite[],
    selectedSuiteIds: Set<string>
): ExecutionPlan {
    const testList: { suite: string; test: FlowchartTestCase }[] = [];
    let totalTests = 0;
    
    for (const suite of suites) {
        if (selectedSuiteIds.has(suite.flowchartId)) {
            for (const test of suite.testCases) {
                testList.push({
                    suite: suite.flowchartName,
                    test: {
                        ...test,
                        flowchartId: suite.flowchartId,
                        flowchartName: suite.flowchartName
                    }
                });
                totalTests++;
            }
        }
    }
    
    const estimatedTime = totalTests * 300;
    
    return {
        totalTests,
        estimatedTime,
        testList
    };
}

export async function executeTest(
    testCase: FlowchartTestCase,
    config: VisualConfig
): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
        const url = `${config.apiUrl}${testCase.apiEndpoint}`;
        
        const response = await fetch(url, {
            method: testCase.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.supabaseKey}`
            },
            body: testCase.requestBody ? JSON.stringify(testCase.requestBody) : undefined
        });
        
        const data = await response.json().catch(() => ({}));
        const duration = Date.now() - startTime;
        
        if (config.testMode) {
            return {
                testName: testCase.testName,
                module: testCase.module,
                passed: true,
                duration,
                response: {
                    status: response.status,
                    data
                }
            };
        }
        
        const validations = validateResponse(data, testCase.validation);
        const allPassed = validations.every(v => v.passed);
        
        return {
            testName: testCase.testName,
            module: testCase.module,
            passed: allPassed,
            duration,
            validations
        };
    } catch (error: any) {
        return {
            testName: testCase.testName,
            module: testCase.module,
            passed: false,
            duration: Date.now() - startTime,
            error: error.message
        };
    }
}

function validateResponse(
    response: unknown,
    rules: ValidationRule[]
): { rule: ValidationRule; passed: boolean; actual: unknown }[] {
    return rules.map(rule => {
        let actual: unknown;
        
        switch (rule.type) {
            case 'status':
                actual = (response as any)?.status;
                break;
            case 'data':
                actual = (response as any)?.data;
                break;
            case 'state':
                actual = (response as any)?.status;
                break;
            case 'count':
                actual = Array.isArray((response as any)?.data) 
                    ? (response as any).data.length 
                    : 0;
                break;
            case 'field':
                actual = (response as any)?.[rule.field];
                break;
            default:
                actual = undefined;
        }
        
        let passed: boolean;
        
        if (rule.expected === '$exists') {
            passed = actual !== undefined && actual !== null;
        } else if (rule.expected === '$increment') {
            passed = typeof actual === 'number';
        } else {
            passed = actual === rule.expected;
        }
        
        return { rule, passed, actual };
    });
}

export async function executeTestsSequentially(
    tests: FlowchartTestCase[],
    config: VisualConfig,
    onProgress: (current: number, total: number, result: TestResult) => void
): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const result = await executeTest(test, config);
        results.push(result);
        onProgress(i + 1, tests.length, result);
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
}

export function exportResults(results: Map<string, TestResult>, filename: string): void {
    const resultsArray = Array.from(results.values());
    
    const passed = resultsArray.filter(r => r.passed).length;
    const failed = resultsArray.filter(r => !r.passed).length;
    const totalDuration = resultsArray.reduce((sum, r) => sum + r.duration, 0);
    
    const report = {
        summary: {
            total: resultsArray.length,
            passed,
            failed,
            passRate: `${((passed / resultsArray.length) * 100).toFixed(2)}%`,
            totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
            executedAt: new Date().toISOString()
        },
        results: resultsArray
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeLink(link);
    URL.revokeObjectURL(url);
}

export function generateHTMLReport(results: Map<string, TestResult>): string {
    const resultsArray = Array.from(results.values());
    const passed = resultsArray.filter(r => r.passed).length;
    const failed = resultsArray.filter(r => !r.passed).length;
    
    const passedTests = resultsArray.filter(r => r.passed);
    const failedTests = resultsArray.filter(r => !r.passed);
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SCM系统流程图测试报告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8fafc;
        }
        .header {
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-card.passed { border-left: 4px solid #10b981; }
        .summary-card.failed { border-left: 4px solid #ef4444; }
        .value { font-size: 32px; font-weight: bold; }
        .label { color: #64748b; margin-top: 8px; }
        .test-list {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .test-item {
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .test-item:last-child { border-bottom: none; }
        .test-item.passed { background: #ecfdf5; }
        .test-item.failed { background: #fef2f2; }
        .icon { font-size: 20px; }
        .name { flex: 1; }
        .duration { color: #64748b; font-size: 14px; }
        .error { color: #ef4444; font-size: 14px; margin-left: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 SCM系统流程图测试报告</h1>
        <p>执行时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <div class="value">${resultsArray.length}</div>
            <div class="label">总测试数</div>
        </div>
        <div class="summary-card passed">
            <div class="value">${passed}</div>
            <div class="label">通过</div>
        </div>
        <div class="summary-card failed">
            <div class="value">${failed}</div>
            <div class="label">失败</div>
        </div>
        <div class="summary-card">
            <div class="value">${((passed / resultsArray.length) * 100).toFixed(1)}%</div>
            <div class="label">通过率</div>
        </div>
    </div>
    
    <h2>📋 测试详情</h2>
    <div class="test-list">
        ${resultsArray.map(result => `
            <div class="test-item ${result.passed ? 'passed' : 'failed'}">
                <span class="icon">${result.passed ? '✅' : '❌'}</span>
                <span class="name">${result.testName}</span>
                <span class="duration">${result.duration}ms</span>
                ${!result.passed && result.error ? `<span class="error">${result.error}</span>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
}
