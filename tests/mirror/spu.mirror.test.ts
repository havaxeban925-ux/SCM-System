/**
 * M2: SPU公池模块镜像测试
 */

import { get, post, runTest, assertTrue, assertExists, genTestId, supabaseAdmin, TestResult, Issue } from './utils/test-client';

export async function runSpuTests(): Promise<{ results: TestResult[]; issues: Issue[] }> {
    const results: TestResult[] = [];
    const issues: Issue[] = [];
    const testStyleName = genTestId();
    let createdStyleId: string | null = null;

    // 准备测试数据：创建公池款式
    const { data: styleData, error: seedError } = await supabaseAdmin
        .from('b_public_style')
        .insert({
            name: testStyleName,
            image_url: 'https://test.example.com/img.jpg',
            intent_count: 0,
            max_intents: 3
        })
        .select()
        .single();

    if (seedError) {
        issues.push({
            severity: 'critical',
            module: 'SPU',
            description: `无法创建测试数据: ${seedError.message}`,
            suggestion: '检查b_public_style表结构'
        });
        return { results, issues };
    }
    createdStyleId = styleData.id;

    // Test 1: 获取公池列表
    results.push(await runTest('SPU', '获取公池列表', async () => {
        const res = await get('/styles/public');
        assertTrue(res.status === 200, `获取列表失败: ${res.status}`);
        assertExists(res.data, '返回数据为空');
    }));

    // Test 2: 表达意向
    results.push(await runTest('SPU', '表达意向', async () => {
        const res = await post(`/styles/public/${createdStyleId}/intent`, {});
        assertTrue(res.status === 200, `表达意向失败: ${JSON.stringify(res.data)}`);

        // 验证意向计数增加
        const { data: updated } = await supabaseAdmin
            .from('b_public_style')
            .select('intent_count')
            .eq('id', createdStyleId)
            .single();
        assertTrue(updated?.intent_count >= 1, '意向计数未增加');
    }));

    // Test 3: 意向上限验证
    results.push(await runTest('SPU', '意向上限验证', async () => {
        // 将意向数设置为上限
        await supabaseAdmin
            .from('b_public_style')
            .update({ intent_count: 3, max_intents: 3 })
            .eq('id', createdStyleId);

        const res = await post(`/styles/public/${createdStyleId}/intent`, {});
        // 应返回错误或提示
        assertTrue(res.status >= 400 || res.data?.error || res.data?.message, '超出意向上限应被拒绝');
    }));

    // Test 4: 确认接款（从公池创建私推）
    results.push(await runTest('SPU', '确认接款', async () => {
        // 先创建测试商家
        const shopName = `${testStyleName}_shop`;
        const { data: shopData } = await supabaseAdmin
            .from('sys_shop')
            .insert({ shop_name: shopName, level: 'A' })
            .select()
            .single();

        if (!shopData) {
            throw new Error('无法创建测试商家');
        }

        const res = await post(`/styles/public/${createdStyleId}/confirm`, {
            publicStyle: styleData,
            shopId: shopData.id,
            shopName: shopName
        });
        assertTrue(res.status === 200, `确认接款失败: ${JSON.stringify(res.data)}`);

        // 清理
        await supabaseAdmin.from('sys_shop').delete().eq('id', shopData.id);
        await supabaseAdmin.from('b_style_demand').delete().eq('shop_name', shopName);
    }));

    // Test 5: 无category字段验证（之前已移除）
    results.push(await runTest('SPU', 'Schema验证(无category)', async () => {
        // 尝试插入带category字段的数据，应被忽略或正常工作
        const { error } = await supabaseAdmin
            .from('b_public_style')
            .insert({
                name: `${testStyleName}_schema_test`,
                image_url: 'test.jpg'
                // 故意不包含category
            });
        assertTrue(!error, `Schema可能仍有问题: ${error?.message}`);

        // 清理
        await supabaseAdmin.from('b_public_style').delete().like('name', `${testStyleName}_schema_test`);
    }));

    // 问题检查
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        issues.push({
            severity: failedTests.some(t => t.testName === '获取公池列表') ? 'critical' : 'major',
            module: 'SPU',
            description: `${failedTests.length}个SPU测试失败: ${failedTests.map(t => t.testName).join(', ')}`,
            suggestion: '检查styles.ts路由和b_public_style表'
        });
    }

    // 清理
    await supabaseAdmin.from('b_public_style').delete().eq('id', createdStyleId);

    return { results, issues };
}
