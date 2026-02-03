/**
 * M1: 认证模块镜像测试
 */

import { post, runTest, assertTrue, assertExists, genTestId, supabaseAdmin, TestResult, Issue } from './utils/test-client';

export async function runAuthTests(): Promise<{ results: TestResult[]; issues: Issue[] }> {
    const results: TestResult[] = [];
    const issues: Issue[] = [];
    const testUsername = genTestId();
    const testShopName = `${testUsername}_Shop`;
    let createdUserId: string | null = null;

    // Test 1: 用户注册
    results.push(await runTest('Auth', '用户注册', async () => {
        const res = await post('/auth/register', {
            username: testUsername,
            password: 'test123456',
            shop_name: testShopName
        });
        assertTrue(res.status === 200 || res.status === 201, `注册失败: ${JSON.stringify(res.data)}`);
        assertExists(res.data?.id || res.data?.user, '注册返回数据无效');
        createdUserId = res.data?.id || res.data?.user?.id;
    }));

    // Test 2: 重复用户名注册
    results.push(await runTest('Auth', '重复用户名拒绝', async () => {
        const res = await post('/auth/register', {
            username: testUsername,
            password: 'another123',
            shop_name: 'Another Shop'
        });
        assertTrue(res.status >= 400, '重复用户名应该被拒绝');
    }));

    // Test 3: 用户审批
    results.push(await runTest('Auth', '用户审批', async () => {
        if (!createdUserId) {
            // 从数据库获取
            const { data } = await supabaseAdmin
                .from('sys_user')
                .select('id')
                .eq('username', testUsername)
                .single();
            createdUserId = data?.id;
        }
        assertExists(createdUserId, '找不到待审批用户');

        const res = await post('/auth/approve', {
            userId: createdUserId,
            keyId: `KEY_${Date.now()}`,
            shopCode: `SC${Date.now().toString().slice(-6)}`,
            level: 'B'
        });
        assertTrue(res.status === 200, `审批失败: ${JSON.stringify(res.data)}`);
    }));

    // Test 4: 登录
    results.push(await runTest('Auth', '用户登录', async () => {
        const res = await post('/auth/login', {
            username: testUsername,
            password: 'test123456'
        });
        assertTrue(res.status === 200, `登录失败: ${JSON.stringify(res.data)}`);
    }));

    // Test 5: 错误密码登录
    results.push(await runTest('Auth', '错误密码拒绝', async () => {
        const res = await post('/auth/login', {
            username: testUsername,
            password: 'wrongpassword'
        });
        assertTrue(res.status >= 400, '错误密码应该被拒绝');
    }));

    // 检查问题
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        issues.push({
            severity: 'critical',
            module: 'Auth',
            description: `${failedTests.length}个认证测试失败: ${failedTests.map(t => t.testName).join(', ')}`,
            suggestion: '检查auth.ts路由和数据库连接'
        });
    }

    // 清理测试数据
    await supabaseAdmin.from('sys_user').delete().eq('username', testUsername);
    await supabaseAdmin.from('sys_shop').delete().eq('shop_name', testShopName);

    return { results, issues };
}
