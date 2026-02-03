/**
 * 完整模拟测试：通过 API 创建店铺 -> 创建删除申请 -> 批准删除 -> 验证
 */
import { get, post, supabaseAdmin } from './utils/test-client.js';

async function fullDeleteFlow() {
    console.log('🔧 Starting full delete flow test...\n');

    // 1. 通过 API 创建店铺
    console.log('1. Creating shop via API...');
    const shopRes = await post('/admin/shops', { shopName: `FullTest_${Date.now()}`, keyId: `FULL_${Date.now()}` });
    const shopId = shopRes.data?.id;
    console.log('✅ Shop created:', shopId);

    // 2. 插入删除申请
    console.log('\n2. Creating delete request...');
    const { data: request, error: insertError } = await supabaseAdmin
        .from('shop_delete_requests')
        .insert({
            shop_id: shopId,
            shop_name: shopRes.data.shop_name,
            reason: 'Full flow test',
            status: 'pending'
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert error:', insertError);
        return;
    }
    console.log('✅ Delete request created:', request.id);

    // 3. 批准删除
    console.log('\n3. Approving delete request...');
    const approveRes = await post(`/admin/shops/delete-requests/${request.id}/approve`, {});
    console.log('API Response:', approveRes.status, approveRes.data);

    // 4. 立即验证
    console.log('\n4. Checking immediately...');
    const { data: check1, error: error1 } = await supabaseAdmin
        .from('sys_shop')
        .select('id')
        .eq('id', shopId)
        .single();

    if (error1?.code === 'PGRST116') {
        console.log('✅ Shop deleted (immediate check)');
    } else {
        console.log('⚠️ Shop still exists (immediate):', check1);

        // 5. 等待 500ms 后再检查
        console.log('\n5. Waiting 500ms...');
        await new Promise(r => setTimeout(r, 500));

        const { data: check2, error: error2 } = await supabaseAdmin
            .from('sys_shop')
            .select('id')
            .eq('id', shopId)
            .single();

        if (error2?.code === 'PGRST116') {
            console.log('✅ Shop deleted (after 500ms)');
        } else {
            console.log('❌ Shop STILL exists (after 500ms):', check2);
        }
    }
}

fullDeleteFlow().catch(console.error);
