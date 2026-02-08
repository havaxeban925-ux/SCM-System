import { config } from 'dotenv';
config({ path: '.env.local' });

import { getSupabase } from './server/lib/supabase';

async function testAuthPending() {
    console.log('=== 测试 /api/auth/pending 接口 ===\n');

    const supabase = getSupabase();

    try {
        console.log('1. 检查 sys_user 表是否存在...');
        const { data: tables, error: tablesError } = await supabase
            .from('sys_user')
            .select('*')
            .limit(1);

        if (tablesError) {
            console.error('❌ sys_user 表查询失败:', tablesError);
            return;
        }
        console.log('✓ sys_user 表存在\n');

        console.log('2. 查询所有用户...');
        const { data: allUsers, error: allError } = await supabase
            .from('sys_user')
            .select('*');

        if (allError) {
            console.error('❌ 查询所有用户失败:', allError);
            return;
        }
        console.log(`✓ 共有 ${allUsers?.length || 0} 个用户\n`);

        console.log('3. 查询待审批用户 (status=pending)...');
        const { data: pendingUsers, error: pendingError } = await supabase
            .from('sys_user')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (pendingError) {
            console.error('❌ 查询待审批用户失败:', pendingError);
            console.error('错误详情:', JSON.stringify(pendingError, null, 2));
            return;
        }

        console.log(`✓ 共有 ${pendingUsers?.length || 0} 个待审批用户`);
        if (pendingUsers && pendingUsers.length > 0) {
            console.log('待审批用户列表:');
            pendingUsers.forEach((user, idx) => {
                console.log(`  ${idx + 1}. ${user.username} - ${user.shop_name || '(无店铺名)'} - ${user.status}`);
            });
        }

        console.log('\n=== 测试完成 ===');

    } catch (err) {
        console.error('❌ 未知错误:', err);
    }
}

testAuthPending();
