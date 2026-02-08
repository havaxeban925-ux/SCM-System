
import { config } from 'dotenv';
config({ path: '.env.local' });

import { getSupabase } from './server/lib/supabase';

async function testDashboardQueries() {
    console.log('=== 测试 /api/admin/dashboard 查询 ===\n');
    const supabase = getSupabase();

    try {
        console.log('1. Testing Shop Total...');
        const { count: shopTotal, error: shopCountError } = await supabase
            .from('sys_shop')
            .select('*', { count: 'exact', head: true });
        if (shopCountError) console.error('❌ Shop Total Failed:', shopCountError);
        else console.log(`✓ Shop Total: ${shopTotal}`);

        console.log('2. Testing Shop Levels...');
        const { data: shopLevelsData, error: shopLevelsError } = await supabase
            .from('sys_shop')
            .select('level, key_id')
            .range(0, 9);
        if (shopLevelsError) console.error('❌ Shop Levels Failed:', shopLevelsError);
        else console.log(`✓ Shop Levels Fetched (first 10)`);

        console.log('3. Testing Parallel Queries...');

        const queries = [
            { name: 'styleTotal', query: supabase.from('b_style_demand').select('*', { count: 'exact', head: true }) },
            { name: 'stylePending', query: supabase.from('b_style_demand').select('*', { count: 'exact', head: true }).in('status', ['new', 'developing', 'helping']) },
            { name: 'pricingTotal', query: supabase.from('b_request_record').select('*', { count: 'exact', head: true }).eq('type', 'pricing') },
            { name: 'pricingPending', query: supabase.from('b_request_record').select('*', { count: 'exact', head: true }).eq('type', 'pricing').eq('status', 'processing') },
            { name: 'anomalyTotal', query: supabase.from('b_request_record').select('*', { count: 'exact', head: true }).eq('type', 'anomaly') },
            { name: 'anomalyPending', query: supabase.from('b_request_record').select('*', { count: 'exact', head: true }).eq('type', 'anomaly').eq('status', 'processing') },
            { name: 'restockTotal', query: supabase.from('b_restock_order').select('*', { count: 'exact', head: true }) },
            { name: 'restockPending', query: supabase.from('b_restock_order').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']) },
            { name: 'spuTotal', query: supabase.from('b_style_demand').select('*', { count: 'exact', head: true }).not('back_spu', 'is', null).neq('back_spu', '') }
        ];

        for (const q of queries) {
            console.log(`Testing ${q.name}...`);
            const { count, error } = await q.query;
            if (error) {
                console.error(`❌ ${q.name} Failed:`, error.message);
                console.error(JSON.stringify(error, null, 2));
            } else {
                console.log(`✓ ${q.name}: ${count}`);
            }
        }

        console.log('\n=== 测试完成 ===');

    } catch (err) {
        console.error('❌ 未知错误:', err);
    }
}

testDashboardQueries();
