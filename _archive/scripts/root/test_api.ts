import { config } from 'dotenv';
config({ path: '.env.local' });

async function testAPI() {
    const baseUrl = 'http://localhost:3001';

    console.log('=== 测试 API 接口 ===\n');

    try {
        // 测试健康检查
        console.log('1. 测试 /api/health...');
        const healthRes = await fetch(`${baseUrl}/api/health`);
        console.log(`   状态码: ${healthRes.status}`);
        if (healthRes.ok) {
            const healthData = await healthRes.json();
            console.log(`   ✓ 响应:`, healthData);
        } else {
            console.log(`   ❌ 失败`);
        }
        console.log();

        // 测试 auth/pending
        console.log('2. 测试 /api/auth/pending...');
        const pendingRes = await fetch(`${baseUrl}/api/auth/pending`);
        console.log(`   状态码: ${pendingRes.status}`);

        if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            console.log(`   ✓ 响应:`, pendingData);
        } else {
            const errorText = await pendingRes.text();
            console.log(`   ❌ 错误: ${errorText}`);
        }

    } catch (err) {
        console.error('❌ 请求失败:', err);
    }

    console.log('\n=== 测试完成 ===');
}

testAPI();
