/**
 * 清理数据库中的示例数据
 * 删除所有已插入的初始化示例数据
 */
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupSampleData() {
    console.log('开始清理示例数据...\n');

    // 1. 删除示例商家 (特定ID)
    const sampleShopIds = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444'
    ];

    // 先删除关联的 style_demand
    const { error: demandErr } = await supabase
        .from('b_style_demand')
        .delete()
        .in('shop_id', sampleShopIds);
    if (demandErr) console.error('删除 b_style_demand 失败:', demandErr.message);
    else console.log('✅ 已删除示例商家关联的 b_style_demand');

    // 删除示例商家
    const { error: shopErr } = await supabase
        .from('sys_shop')
        .delete()
        .in('id', sampleShopIds);
    if (shopErr) console.error('删除 sys_shop 失败:', shopErr.message);
    else console.log('✅ 已删除示例商家 (sys_shop)');

    // 2. 删除示例公池款式 (按名称匹配)
    const samplePublicNames = ['高腰直筒牛仔裤', '羊毛开衫'];
    const { error: publicErr } = await supabase
        .from('b_public_style')
        .delete()
        .in('name', samplePublicNames);
    if (publicErr) console.error('删除 b_public_style 失败:', publicErr.message);
    else console.log('✅ 已删除示例公池款式 (b_public_style)');

    // 3. 删除示例申请记录 (按 shop_name 匹配)
    const { error: reqErr } = await supabase
        .from('b_request_record')
        .delete()
        .eq('shop_name', '测试商家');
    if (reqErr) console.error('删除 b_request_record 失败:', reqErr.message);
    else console.log('✅ 已删除示例申请记录 (b_request_record)');

    // 4. 删除示例补货订单 (按 skc_code 匹配)
    const sampleSkcCodes = ['SKC2023001', 'SKC2023005'];
    const { error: restockErr } = await supabase
        .from('b_restock_order')
        .delete()
        .in('skc_code', sampleSkcCodes);
    if (restockErr) console.error('删除 b_restock_order 失败:', restockErr.message);
    else console.log('✅ 已删除示例补货订单 (b_restock_order)');

    console.log('\n🎉 示例数据清理完成！');
}

cleanupSampleData().catch(console.error);
