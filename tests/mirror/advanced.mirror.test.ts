/**
 * M8: 高级场景测试 (覆盖方案 7-9)
 * 包括: 系统驾驶舱、高级开发流、复杂核价博弈
 */

import { get, post, runTest, assertTrue, assertExists, genTestId, supabaseAdmin, TestResult, Issue } from './utils/test-client';

export async function runAdvancedTests(): Promise<{ results: TestResult[]; issues: Issue[] }> {
    const results: TestResult[] = [];
    const issues: Issue[] = [];
    const testId = genTestId();
    const shopName = `AdvShop_${testId}`;

    // ============ 方案 7: 系统驾驶舱 & 主数据 ============

    // Test 1: 系统驾驶舱数据
    results.push(await runTest('Admin', '系统驾驶舱数据', async () => {
        const res = await get('/admin/dashboard');
        assertTrue(res.status === 200, `获取失败: ${res.status}`);
        assertExists(res.data?.stats, '缺少统计数据');
        assertExists(res.data?.stats?.shop_total, '缺少商铺总数');
        // 验证数据类型
        assertTrue(typeof res.data.stats.shop_total === 'number', '商铺总数类型错误');
    }));

    // Test 2: 商家删除申请流程
    results.push(await runTest('Admin', '商家删除申请流程', async () => {
        // 1. 先创建一个待删除店铺
        const shopRes = await post('/admin/shops', { shopName: `Del_${testId}`, keyId: `DEL_${testId}` });
        const shopId = shopRes.data?.id;
        assertExists(shopId, '创建店铺失败');

        // 2. 模拟插入一条删除申请 (因为目前没有前端接口提交删除申请，通过DB模拟)
        const { error: insertError } = await supabaseAdmin.from('shop_delete_requests').insert({
            shop_id: shopId,
            shop_name: `Del_${testId}`,
            reason: 'Test Delete',
            status: 'pending'
        });
        assertTrue(!insertError, `模拟申请失败: ${insertError?.message}`);

        // 3. 获取申请列表
        const listRes = await get('/admin/shops/delete-requests');
        assertTrue(listRes.status === 200, '获取申请列表失败');
        const requests = listRes.data?.requests as any[];
        const targetReq = requests.find(r => r.shop_id === shopId);
        assertExists(targetReq, '未找到刚创建的删除申请');

        // 4. 批准删除
        const approveRes = await post(`/admin/shops/delete-requests/${targetReq.id}/approve`, {});
        assertTrue(approveRes.status === 200, `批准删除失败: ${JSON.stringify(approveRes.data)}`);

        // 等待删除操作完成 (API返回后数据库操作可能仍在进行)
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. 验证店铺已被物理删除
        const { data: shopCheck, error: checkError } = await supabaseAdmin.from('sys_shop').select('id').eq('id', shopId).single();
        // Supabase .single() 在找不到记录时会返回 PGRST116 错误，而不是 null
        assertTrue(checkError?.code === 'PGRST116' || !shopCheck, `店铺未被彻底删除: ${shopCheck?.id}`);
    }));


    // ============ 方案 8: 深度开发协同 ============

    // Test 3: 公海推款 (无需指定店铺)
    results.push(await runTest('AdvancedDev', '公海推款', async () => {
        const res = await post('/admin/push/public', {
            imageUrl: 'http://test.com/public.jpg',
            name: `PublicStyle_${testId}`,
            maxIntents: 5,
            tags: ['Hot']
        });
        assertTrue(res.status === 200, `公推失败: ${JSON.stringify(res.data)}`);
        assertExists(res.data?.id, '未返回款式ID');
    }));

    // Test 4: 开发中断 (放弃开发)
    results.push(await runTest('AdvancedDev', '放弃开发流程', async () => {
        // 1. 准备数据：需要一个处于 developing 状态的款式
        // 借用 M1 测试中的逻辑快速创建一个
        const { data: style } = await supabaseAdmin.from('b_style_demand').insert({
            shop_name: shopName,
            status: 'developing',
            name: `AbandonStyle_${testId}`
        }).select().single();
        const styleId = style.id;

        // 2. 调用放弃接口
        const res = await post(`/development/${styleId}/abandon`, { reason: '成本过高' });
        assertTrue(res.status === 200, `放弃失败: ${JSON.stringify(res.data)}`);

        // 3. 验证状态
        const { data: check } = await supabaseAdmin.from('b_style_demand').select('status, remark').eq('id', styleId).single();
        assertTrue(check?.status === 'abandoned', `状态未更新: ${check?.status}`);
        assertTrue(check?.remark?.includes('成本过高'), '原因未记录');
    }));


    // ============ 方案 9: 复杂价格博弈 ============

    // Test 5: 同款同价申请
    results.push(await runTest('ComplexPricing', '同款同价申请', async () => {
        const res = await post('/requests/same-price', {
            shopName: shopName,
            items: [{
                targetCode: `SamePrice_${testId}`,
                refCode: `Ref_${testId}`,
                suggestedPrice: 100,
                refPrice: 100
            }]
        });
        assertTrue(res.status === 200, `创建同款同价失败: ${JSON.stringify(res.data)}`);
        assertTrue(res.data?.sub_type === '同款同价', '申请类型错误');
    }));

    // Test 6: 涨价申请
    results.push(await runTest('ComplexPricing', '涨价申请', async () => {
        const res = await post('/requests/price-increase', {
            shopName: shopName,
            items: [{
                targetCode: `Inc_${testId}`,
                increasePrice: 120
            }]
        });
        assertTrue(res.status === 200, `创建涨价申请失败: ${JSON.stringify(res.data)}`);
        assertTrue(res.data?.sub_type === '申请涨价', '申请类型错误');
    }));

    // Test 7: 商家主动申请发款 (Style Application)
    results.push(await runTest('ComplexPricing', '商家主动申请发款', async () => {
        const res = await post('/requests/style-application', {
            applications: [{
                shopName: shopName,
                images: ['http://test.com/app.jpg'],
                remark: '我想做个爆款'
            }]
        });
        assertTrue(res.status === 200, `申请发款失败: ${JSON.stringify(res.data)}`);

        // 验证是否批量创建成功
        assertExists(res.data?.records, '未返回记录列表');
        assertTrue(res.data.records.length > 0, '记录列表为空');
        assertTrue(res.data.records[0].sub_type === '申请发款', '申请类型错误');
    }));

    // 清理
    await supabaseAdmin.from('b_style_demand').delete().like('name', `%${testId}%`);
    await supabaseAdmin.from('b_request_record').delete().eq('shop_name', shopName);

    return { results, issues };
}
