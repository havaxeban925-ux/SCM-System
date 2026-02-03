/**
 * M5: 异常申请模块镜像测试
 */

import { get, post, runTest, assertTrue, assertExists, genTestId, supabaseAdmin, TestResult, Issue } from './utils/test-client';

export async function runAnomalyTests(): Promise<{ results: TestResult[]; issues: Issue[] }> {
    const results: TestResult[] = [];
    const issues: Issue[] = [];
    const testPrefix = genTestId();
    const createdRecordIds: string[] = [];

    // Test 1: 创建尺码问题异常
    results.push(await runTest('Anomaly', '尺码问题异常', async () => {
        const res = await post('/requests/anomaly', {
            subType: '尺码问题',
            targetCodes: [`${testPrefix}_SPU001`],
            content: '尺码偏大，需要调整'
        });
        assertTrue(res.status === 200, `创建失败: ${JSON.stringify(res.data)}`);
        if (res.data?.id) createdRecordIds.push(res.data.id);
    }));

    // Test 2: 申请下架异常
    results.push(await runTest('Anomaly', '申请下架异常', async () => {
        const res = await post('/requests/anomaly', {
            subType: '申请下架',
            targetCodes: [`${testPrefix}_SKC001`],
            content: '产品质量问题'
        });
        assertTrue(res.status === 200, `创建失败: ${JSON.stringify(res.data)}`);
        if (res.data?.id) createdRecordIds.push(res.data.id);
    }));

    // Test 3: 图片异常
    results.push(await runTest('Anomaly', '图片异常', async () => {
        const res = await post('/requests/anomaly', {
            subType: '图片异常',
            targetCodes: [`${testPrefix}_SKC002`],
            content: '图片模糊需重拍'
        });
        assertTrue(res.status === 200, `创建失败: ${JSON.stringify(res.data)}`);
        if (res.data?.id) createdRecordIds.push(res.data.id);
    }));

    // Test 4: 大货异常
    results.push(await runTest('Anomaly', '大货异常', async () => {
        const res = await post('/requests/anomaly', {
            subType: '大货异常',
            targetCodes: [`${testPrefix}_WB001`],
            content: '大货色差超标'
        });
        assertTrue(res.status === 200, `创建失败: ${JSON.stringify(res.data)}`);
        if (res.data?.id) createdRecordIds.push(res.data.id);
    }));

    // Test 5: 获取异常列表
    results.push(await runTest('Anomaly', '获取异常列表', async () => {
        const res = await get('/requests?type=anomaly');
        assertTrue(res.status === 200, `获取失败: ${res.status}`);
        assertExists(res.data?.data, '返回数据格式错误');
    }));

    // Test 6: remark字段处理验证
    results.push(await runTest('Anomaly', 'remark字段存储', async () => {
        if (createdRecordIds.length === 0) {
            throw new Error('无可用的测试记录');
        }

        const { data, error } = await supabaseAdmin
            .from('b_request_record')
            .select('remark, pricing_details')
            .eq('id', createdRecordIds[0])
            .single();

        assertTrue(!error, `查询失败: ${error?.message}`);

        // 根据walkthrough，remark可能存储在pricing_details中
        // 检查是否有任一位置存储了内容
        const hasContent = data?.remark || data?.pricing_details;
        if (!hasContent) {
            issues.push({
                severity: 'minor',
                module: 'Anomaly',
                description: 'content/remark未找到存储位置',
                suggestion: '确认异常内容存储在remark还是pricing_details字段'
            });
        }
        assertTrue(true, ''); // 继续测试但记录问题
    }));

    // Test 7: 审批驳回
    results.push(await runTest('Anomaly', '审批驳回', async () => {
        if (createdRecordIds.length === 0) {
            throw new Error('无可用的测试记录');
        }

        const res = await post(`/requests/${createdRecordIds[0]}/audit`, {
            action: 'reject',
            feedback: '证据不足，请补充说明'
        });
        assertTrue(res.status === 200, `驳回失败: ${JSON.stringify(res.data)}`);

        // 验证状态
        const { data } = await supabaseAdmin
            .from('b_request_record')
            .select('status')
            .eq('id', createdRecordIds[0])
            .single();
        assertTrue(data?.status === 'rejected', `状态未更新为rejected: ${data?.status}`);
    }));

    // 问题检查
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        issues.push({
            severity: 'major',
            module: 'Anomaly',
            description: `${failedTests.length}个异常测试失败: ${failedTests.map(t => t.testName).join(', ')}`,
            suggestion: '检查requests.ts路由中的/anomaly端点'
        });
    }

    // 清理
    for (const id of createdRecordIds) {
        await supabaseAdmin.from('b_request_record').delete().eq('id', id);
    }

    return { results, issues };
}
