/**
 * 清理商家数据（先删除依赖数据）
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function cleanup() {
    console.log('=== 开始清理所有相关数据 ===\n');

    // 1. 先清理 b_style_demand（款式需求）
    console.log('1. 清理 b_style_demand 表...');
    const { count: styleCount, error: styleError } = await supabase
        .from('b_style_demand')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (styleError) console.error('   错误:', styleError.message);
    else console.log(`   ✓ 删除 ${styleCount ?? 0} 条`);

    // 2. 清理 b_pricing_demand（定价需求）  
    console.log('2. 清理 b_pricing_demand 表...');
    const { count: pricingCount, error: pricingError } = await supabase
        .from('b_pricing_demand')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (pricingError) console.error('   错误:', pricingError.message);
    else console.log(`   ✓ 删除 ${pricingCount ?? 0} 条`);

    // 3. 清理 b_anomaly_order（异常订单）
    console.log('3. 清理 b_anomaly_order 表...');
    const { count: anomalyCount, error: anomalyError } = await supabase
        .from('b_anomaly_order')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (anomalyError) console.error('   错误:', anomalyError.message);
    else console.log(`   ✓ 删除 ${anomalyCount ?? 0} 条`);

    // 4. 清理 b_request_record（申请记录）
    console.log('4. 清理 b_request_record 表...');
    const { count: requestCount, error: requestError } = await supabase
        .from('b_request_record')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (requestError) console.error('   错误:', requestError.message);
    else console.log(`   ✓ 删除 ${requestCount ?? 0} 条`);

    // 5. 清理 b_push_history（推送历史）
    console.log('5. 清理 b_push_history 表...');
    const { count: pushCount, error: pushError } = await supabase
        .from('b_push_history')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (pushError) console.error('   错误:', pushError.message);
    else console.log(`   ✓ 删除 ${pushCount ?? 0} 条`);

    // 6. 最后清理 sys_shop（商家）
    console.log('6. 清理 sys_shop 表...');
    const { count: shopCount, error: shopError } = await supabase
        .from('sys_shop')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (shopError) console.error('   错误:', shopError.message);
    else console.log(`   ✓ 删除 ${shopCount ?? 0} 个商家`);

    console.log('\n=== 清理完成 ===');
}

cleanup();
