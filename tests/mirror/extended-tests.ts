
/**
 * 补充自动化测试 - 覆盖演示方案中的闲置功能
 */

import { get, post, patch, runTest, assertTrue, assertExists, genTestId, supabaseAdmin, TestResult, Issue } from './utils/test-client';

export async function runExtendedTests(): Promise<{ results: TestResult[]; issues: Issue[] }> {
    const results: TestResult[] = [];
    const issues: Issue[] = [];
    const testId = genTestId();

    // ============ 场景一: 管理员与认证 ============

    // Test 1: 标签管理 (Tags)
    results.push(await runTest('Admin', '创建与获取标签', async () => {
        // 创建
        const tagRes = await post('/admin/tags', { name: `TestTag_${testId}`, category: 'visual' });
        if (tagRes.status !== 200) console.error('Create Tag Failed:', JSON.stringify(tagRes.data));
        assertTrue(tagRes.status === 200, '创建标签失败');

        // 获取
        const listRes = await get('/admin/tags?category=visual');
        assertTrue(listRes.status === 200, '获取标签列表失败');
        const tags = listRes.data as any[];
        assertTrue(tags.some(t => t.name === `TestTag_${testId}`), '新标签未在列表中');
    }));

    // Test 2: 商铺管理 (Shops)
    let createdShopId = '';
    results.push(await runTest('Admin', '商铺生命周期', async () => {
        // 创建
        const createRes = await post('/admin/shops', {
            shopName: `Shop_${testId}`,
            keyId: `KEY_${testId}`,
            level: 'A'
        });
        assertTrue(createRes.status === 200, '创建商铺失败');
        createdShopId = createRes.data?.id;
        assertExists(createdShopId, '返回无ID');

        // 更新
        const updateRes = await patch(`/admin/shops/${createdShopId}`, { level: 'S' });
        assertTrue(updateRes.status === 200, '更新商铺失败');
    }));


    // ============ 场景二: 开发与推款 ============

    // Test 3: 定向私推 (Private Push)
    results.push(await runTest('Push', '定向私推操作', async () => {
        const res = await post('/admin/push/private', {
            shopIds: [createdShopId],
            name: `Style_${testId}`,
            imageUrl: 'http://test.com/img.jpg',
            deadline: 5,
            tags: ['New']
        });
        if (res.status !== 200) console.error('Private Push Failed:', JSON.stringify(res.data));
        assertTrue(res.status === 200, '私推失败');
        assertTrue(res.data?.count === 1, '私推数量不正确');
    }));

    // Test 4: 开发流转 (Develop Flow)
    // 先获取刚才推的款式（通过 style 列表）
    let styleId = '';
    results.push(await runTest('Development', '开发全流程', async () => {
        // 1. 获取款式
        const listRes = await get(`/admin/styles?shopId=${createdShopId}`);
        const style = (listRes.data?.data as any[])?.[0];
        assertExists(style, '未找到推送的款式');
        styleId = style.id;

        // 2. 转入开发 (需先模拟意向? 私推默认是new，可以直接操作状态吗？查看schema: status默认new)
        // 模拟转入开发 (Mocking the transition logic usually done by 'confirm' endpoint or direct update)
        // 这里直接调用 update status 接口
        await supabaseAdmin.from('b_style_demand').update({ status: 'developing' }).eq('id', styleId);

        // 3. 申请帮看
        const helpRes = await post(`/development/${styleId}/helping`, { imageUrl: 'http://mod.jpg' });
        assertTrue(helpRes.status === 200, '申请帮看失败');

        // 4. 确认帮看通过
        const okRes = await post(`/development/${styleId}/confirm-ok`, {});
        assertTrue(okRes.status === 200, '确认帮看失败');

        // 5. 上传SPU (完成)
        const spuRes = await post(`/development/${styleId}/spu`, { spuList: `SPU_${testId}` });
        assertTrue(spuRes.status === 200, '上传SPU失败');

        // 验证最终状态
        const { data } = await supabaseAdmin.from('b_style_demand').select('status').eq('id', styleId).single();
        assertTrue(data?.status === 'completed', '最终状态不是completed');
    }));


    // ============ 场景四: 供应链异常 ============

    // Test 5: 商家拒单 (Restock Reject)
    results.push(await runTest('Restock', '商家拒单流程', async () => {
        // 1. 创建补货单
        const { data: order } = await supabaseAdmin.from('b_restock_order').insert({
            skc_code: `SKC_${testId}`,
            shop_id: createdShopId,
            plan_quantity: 100,
            status: 'pending'
        }).select().single();
        const orderId = order.id;

        // 2. 商家拒单
        const rejectRes = await post(`/restock/${orderId}/reject`, { reason: '产能不足' });
        assertTrue(rejectRes.status === 200, '拒单请求失败');

        // 验证状态 -> reviewing
        const { data: ord1 } = await supabaseAdmin.from('b_restock_order').select('status').eq('id', orderId).single();
        assertTrue(ord1?.status === 'reviewing', `状态应为reviewing，实际: ${ord1?.status}`);

        // 3. 买手确认取消
        const cancelRes = await post(`/restock/${orderId}/cancel-confirm`, {});
        assertTrue(cancelRes.status === 200, '确认取消失败');

        // 验证状态 -> cancelled
        const { data: ord2 } = await supabaseAdmin.from('b_restock_order').select('status').eq('id', orderId).single();
        assertTrue(ord2?.status === 'cancelled', `状态应为cancelled，实际: ${ord2?.status}`);
    }));

    // 清理
    await supabaseAdmin.from('sys_shop').delete().eq('id', createdShopId);
    await supabaseAdmin.from('b_tag').delete().eq('name', `TestTag_${testId}`);

    return { results, issues };
}
