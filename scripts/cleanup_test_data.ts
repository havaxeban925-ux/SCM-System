
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CORE_MERCHANTS = ['12345678901', '12345678902', '12345678903', '12345678904'];
const CORE_SHOPS = ['春秋女装旗舰店', '夏日时尚馆', '冬季保暖专营', '四季潮流店', '示例官方旗舰店'];

async function cleanup() {
    console.log('Starting data cleanup...');

    // 1. Clear transactional tables
    const tablesToClear = [
        'b_style_demand',
        'b_public_style',
        'b_request_record',
        'b_quote_order',
        'b_restock_order',
        'b_restock_logistics',
        'shop_delete_requests',
        'b_request_record_archive',
        'b_tag'
    ];

    for (const table of tablesToClear) {
        console.log(`Clearing table: ${table}...`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) console.error(`Error clearing ${table}:`, error.message);
    }

    // 2. Filter sys_user
    console.log('Filtering sys_user...');
    const { data: users } = await supabase.from('sys_user').select('id, username, role');
    if (users) {
        const usersToDelete = users.filter(u =>
            u.role !== 'admin' &&
            !CORE_MERCHANTS.includes(u.username)
        );

        console.log(`Deleting ${usersToDelete.length} non-core users...`);
        for (const user of usersToDelete) {
            await supabase.from('sys_user').delete().eq('id', user.id);
        }
    }

    // 3. Filter sys_shop
    console.log('Filtering sys_shop...');
    const { data: shops } = await supabase.from('sys_shop').select('id, shop_name');
    if (shops) {
        const shopsToDelete = shops.filter(s =>
            !CORE_SHOPS.includes(s.shop_name) &&
            !s.shop_name.includes('旗舰店') && // Extra safety for important shops
            !s.shop_name.includes('时尚馆') &&
            !s.shop_name.includes('专营') &&
            !s.shop_name.includes('潮流店')
        );

        // Refine shopsToDelete to be more strict if needed
        const strictShopsToDelete = shops.filter(s => !CORE_SHOPS.includes(s.shop_name));

        console.log(`Deleting ${strictShopsToDelete.length} non-core shops...`);
        for (const shop of strictShopsToDelete) {
            await supabase.from('sys_shop').delete().eq('id', shop.id);
        }
    }

    console.log('Cleanup step 1 finished.');
}

cleanup().catch(console.error);
