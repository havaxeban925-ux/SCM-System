/**
 * M6: 补货订单模块镜像测试
 */

import { get, post, patch, runTest, assertTrue, assertExists, genTestId, supabaseAdmin, TestResult, Issue } from './utils/test-client';

export async function runRestockTests(): Promise<{ results: TestResult[]; issues: Issue[] }> {
    const results: TestResult[] = [];
    const issues: Issue[] = [];
    const testSkc = `${genTestId()}_RESTOCK`;
    let createdOrderId: string | null = null;
    let createdShopId: string | null = null;

    // 准备测试商家
    const { data: shopData, error: shopError } = await supabaseAdmin
        .from('sys_shop')
        .insert({ shop_name: `${testSkc}_Shop`, level: 'A' })
        .select()
        .single();

    if (shopError) {
        issues.push({
            severity: 'critical',
            module: 'Restock',
            description: `无法创建测试商家: ${shopError.message}`,
            suggestion: '检查sys_shop表结构'
        });
        return { results, issues };
    }
    createdShopId = shopData.id;

    // 准备测试补货单
    const { data: orderData, error: orderError } = await supabaseAdmin
        .from('b_restock_order')
        .insert({
            skc_code: testSkc,
            name: '测试补货款式',
            image_url: 'https://test.example.com/img.jpg',
            shop_id: createdShopId,
            plan_quantity: 100,
            actual_quantity: null,
            arrived_quantity: 0,
            status: 'pending'
        })
        .select()
        .single();

    if (orderError) {
        issues.push({
            severity: 'critical',
            module: 'Restock',
            description: `无法创建测试订单: ${orderError.message}`,
            suggestion: '检查b_restock_order表结构'
        });
        // 清理商家
        await supabaseAdmin.from('sys_shop').delete().eq('id', createdShopId);
        return { results, issues };
    }
    createdOrderId = orderData.id;

    // Test 1: 获取补货列表
    results.push(await runTest('Restock', '获取补货列表', async () => {
        const res = await get('/restock');
        assertTrue(res.status === 200, `获取失败: ${res.status}`);
        assertExists(res.data?.data || res.data, '返回数据为空');
    }));

    // Test 2: 更新接单数量
    results.push(await runTest('Restock', '更新接单数量', async () => {
        const res = await patch(`/restock/${createdOrderId}/quantity`, {
            quantity: 80,
            reason: '产能受限，只能接80件'
        });
        assertTrue(res.status === 200, `更新失败: ${JSON.stringify(res.data)}`);

        // 验证更新
        const { data } = await supabaseAdmin
            .from('b_restock_order')
            .select('actual_quantity, reduction_reason')
            .eq('id', createdOrderId)
            .single();
        assertTrue(data?.actual_quantity === 80, `数量未更新: ${data?.actual_quantity}`);
    }));

    // Test 3: 确认接单
    results.push(await runTest('Restock', '确认接单', async () => {
        const res = await post(`/restock/${createdOrderId}/confirm`, {});
        assertTrue(res.status === 200, `确认失败: ${JSON.stringify(res.data)}`);
    }));

    // Test 4: 发货
    results.push(await runTest('Restock', '发货操作', async () => {
        // 先将状态改为可发货
        await supabaseAdmin
            .from('b_restock_order')
            .update({ status: 'producing' })
            .eq('id', createdOrderId);

        const res = await post(`/restock/${createdOrderId}/ship`, {
            wbNumber: `WB${Date.now()}`,
            logisticsCompany: '顺丰',
            shippedQty: 40
        });
        assertTrue(res.status === 200, `发货失败: ${JSON.stringify(res.data)}`);
    }));

    // Test 5: 获取物流明细
    results.push(await runTest('Restock', '获取物流明细', async () => {
        const res = await get(`/restock/${createdOrderId}/logistics`);
        assertTrue(res.status === 200, `获取失败: ${res.status}`);
    }));

    // Test 6: 入仓确认
    results.push(await runTest('Restock', '入仓确认', async () => {
        // 先将状态改为待确认
        await supabaseAdmin
            .from('b_restock_order')
            .update({ status: 'confirming' })
            .eq('id', createdOrderId);

        const res = await post(`/restock/${createdOrderId}/arrival`, {});
        assertTrue(res.status === 200, `确认失败: ${JSON.stringify(res.data)}`);

        // 验证状态
        const { data } = await supabaseAdmin
            .from('b_restock_order')
            .select('status')
            .eq('id', createdOrderId)
            .single();
        assertTrue(data?.status === 'confirmed', `状态未更新为confirmed: ${data?.status}`);
    }));

    // 问题检查
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        issues.push({
            severity: failedTests.some(t => t.testName === '获取补货列表') ? 'critical' : 'major',
            module: 'Restock',
            description: `${failedTests.length}个补货测试失败: ${failedTests.map(t => t.testName).join(', ')}`,
            suggestion: '检查restock.ts路由'
        });
    }

    // 清理
    await supabaseAdmin.from('b_restock_logistics').delete().eq('restock_order_id', createdOrderId);
    await supabaseAdmin.from('b_restock_order').delete().eq('id', createdOrderId);
    await supabaseAdmin.from('sys_shop').delete().eq('id', createdShopId);

    return { results, issues };
}
