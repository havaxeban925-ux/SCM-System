
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config();
config({ path: '.env.local', override: true });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function debugData() {
    console.log('--- Debugging Dashboard Data Discrepancy ---');

    console.log('\n1. Checking b_style_demand counts (Dashboard Metric: "款式工单"):');
    const { count: total, error } = await supabase
        .from('b_style_demand')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting:', error.message);
    } else {
        console.log(`Total records in DB: ${total}`);
    }

    console.log('\n2. Status Distribution:');
    const { data: allRows } = await supabase
        .from('b_style_demand')
        .select('id, status, created_at, shop_id, push_type, name');

    const statusMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};

    (allRows || []).forEach(row => {
        statusMap[row.status] = (statusMap[row.status] || 0) + 1;
        typeMap[row.push_type] = (typeMap[row.push_type] || 0) + 1;
    });

    console.log('Status Counts:', statusMap);
    console.log('Push Type Counts:', typeMap);

    console.log('\n3. Sample Records (First 5):');
    console.table((allRows || []).slice(0, 5));

    console.log('\n4. Checking Shops (Dashboard Metric: "商家数量"):');
    const { data: shops } = await supabase.from('sys_shop').select('id, shop_name');
    console.log(`Total Shops: ${shops?.length}`);
    console.table(shops);

    // Check if style demands link to existing shops
    const shopIds = new Set((shops || []).map(s => s.id));
    const orphanedStyles = (allRows || []).filter(r => !shopIds.has(r.shop_id));

    console.log(`\n5. Orphaned Styles (Shop ID not in sys_shop): ${orphanedStyles.length}`);
    if (orphanedStyles.length > 0) {
        console.log('Sample Orphaned Style:', orphanedStyles[0]);
    }
}

debugData();
