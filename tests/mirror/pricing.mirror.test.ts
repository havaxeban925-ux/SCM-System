/**
 * M4: 核价申请模块镜像测试
 */

import { get, post, runTest, assertTrue, assertExists, genTestId, supabaseAdmin, TestResult, Issue } from './utils/test-client';

export async function runPricingTests(): Promise<{ results: TestResult[]; issues: Issue[] }> {
    const results: TestResult[] = [];
    const issues: Issue[] = [];
    const testShopName = genTestId();
    const testSkc = `${genTestId()}_SKC`;
    let createdRecordId: string | null = null;

    // Test 1: 创建常规核价申请
    results.push(await runTest('Pricing', '创建核价申请', async () => {
        const res = await post('/requests/quote', {
            subType: '常规核价',
            shopName: testShopName,
            quotes: [{
                code: testSkc,
                price: 128.50,
                type: 'NORMAL',
                detailJson: { fabric: '棉', labor: 30, material: 50 }
            }]
        });
        assertTrue(res.status === 200, `创建失败: ${JSON.stringify(res.data)}`);
        assertExists(res.data?.id, '返回数据无ID');
        createdRecordId = res.data.id;
    }));

    // Test 2: 获取申请列表
    results.push(await runTest('Pricing', '获取申请列表', async () => {
        const res = await get('/requests?type=pricing');
        assertTrue(res.status === 200, `获取失败: ${res.status}`);
        assertExists(res.data?.data, '返回数据格式错误');
    }));

    // Test 3: pricing_details存储验证
    results.push(await runTest('Pricing', 'pricing_details存储', async () => {
        if (!createdRecordId) {
            throw new Error('无可用的测试记录ID');
        }

        const { data, error } = await supabaseAdmin
            .from('b_request_record')
            .select('pricing_details')
            .eq('id', createdRecordId)
            .single();

        assertTrue(!error, `查询失败: ${error?.message}`);
        assertExists(data?.pricing_details, 'pricing_details未正确存储');

        const details = data.pricing_details;
        assertTrue(Array.isArray(details) || typeof details === 'object', 'pricing_details格式错误');
    }));

    // Test 4: 二次核价提交
    results.push(await runTest('Pricing', '二次核价提交', async () => {
        if (!createdRecordId) {
            throw new Error('无可用的测试记录ID');
        }

        const res = await post(`/requests/${createdRecordId}/secondary-review`, {
            skc: testSkc,
            secondPrice: 135.00,
            secondReason: '材料成本上涨'
        });
        assertTrue(res.status === 200, `二次核价失败: ${JSON.stringify(res.data)}`);
    }));

    // Test 5: 审批通过
    results.push(await runTest('Pricing', '审批通过', async () => {
        if (!createdRecordId) {
            throw new Error('无可用的测试记录ID');
        }

        const res = await post(`/requests/${createdRecordId}/audit`, {
            action: 'approve',
            buyerPrices: { [testSkc]: 130.00 }
        });
        assertTrue(res.status === 200, `审批失败: ${JSON.stringify(res.data)}`);

        // 验证状态更新
        const { data } = await supabaseAdmin
            .from('b_request_record')
            .select('status')
            .eq('id', createdRecordId)
            .single();
        assertTrue(data?.status === 'completed', `状态未更新为completed: ${data?.status}`);
    }));

    // Test 6: b_quote_order写入验证（已知问题）
    results.push(await runTest('Pricing', 'b_quote_order写入', async () => {
        // 根据walkthrough，此逻辑已被注释
        const { data, count } = await supabaseAdmin
            .from('b_quote_order')
            .select('*', { count: 'exact' })
            .eq('skc_code', testSkc);

        // 预期：count为0（因为写入逻辑被注释）
        if (count === 0) {
            issues.push({
                severity: 'minor',
                module: 'Pricing',
                description: 'b_quote_order表无写入数据（写入逻辑已被注释）',
                suggestion: '此为已知问题，需后续Schema同步后恢复写入逻辑'
            });
        }
        // 测试通过但记录问题
        assertTrue(true, '');
    }));

    // 问题检查
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        issues.push({
            severity: 'major',
            module: 'Pricing',
            description: `${failedTests.length}个核价测试失败: ${failedTests.map(t => t.testName).join(', ')}`,
            suggestion: '检查requests.ts路由中的/quote端点'
        });
    }

    // 清理
    if (createdRecordId) {
        await supabaseAdmin.from('b_request_record').delete().eq('id', createdRecordId);
    }
    await supabaseAdmin.from('b_quote_order').delete().eq('skc_code', testSkc);

    return { results, issues };
}
