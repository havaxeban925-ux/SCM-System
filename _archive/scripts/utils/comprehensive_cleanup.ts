
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveCleanup() {
    console.log('🏁 Starting comprehensive data cleanup...');

    const tablesToClear = [
        { name: 'b_quote_order', label: '核价工单明细' },
        { name: 'b_request_record', label: '工单申请记录' },
        { name: 'b_style_demand', label: '款式需求/推款历史' },
        { name: 'b_public_style', label: '公池款式' },
        { name: 'b_restock_logistics', label: '补货物流' },
        { name: 'b_restock_order', label: '补货工单' }
    ];

    for (const table of tablesToClear) {
        console.log(`⏳ Clearing ${table.label} (${table.name})...`);
        const { error, count } = await supabase
            .from(table.name)
            .delete({ count: 'exact' })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) {
            console.error(`❌ Error clearing ${table.name}:`, error.message);
        } else {
            console.log(`✅ Cleared ${table.name} (${count} rows)`);
        }
    }

    // 7. Clear Users (Exclude Admin)
    console.log('⏳ Clearing merchant users (excluding admins)...');
    const { error: userError, count: userCount } = await supabase
        .from('sys_user')
        .delete({ count: 'exact' })
        .neq('role', 'admin');

    if (userError) {
        console.error('❌ Error clearing sys_user:', userError.message);
    } else {
        console.log(`✅ Cleared sys_user (${userCount} rows, admins preserved)`);
    }

    // 8. Clear Shops
    console.log('⏳ Clearing shops (sys_shop)...');
    const { error: shopError, count: shopCount } = await supabase
        .from('sys_shop')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (shopError) {
        console.error('❌ Error clearing sys_shop:', shopError.message);
    } else {
        console.log(`✅ Cleared sys_shop (${shopCount} rows)`);
    }

    console.log('🎉 Comprehensive cleanup complete!');
}

comprehensiveCleanup().catch(console.error);
