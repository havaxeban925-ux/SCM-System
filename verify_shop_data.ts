
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config();
config({ path: '.env.local', override: true });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function verifyData() {
    console.log('--- Verifying Data Cleanup ---');

    // 1. List all tables in public schema
    /* 
       Note: Standard Supabase user might not have permission to access information_schema directly via client 
       depending on policy, but usually works with service role or if public. 
       If fails, we skip.
    */
    /*
    const { data: tables, error: tableError } = await supabase
        .rpc('get_all_tables_names'); // Assuming no RPC, we skip this or try standard query if allowed.
    */

    // 2. Check counts for key transaction tables
    const tablesToCheck = [
        'b_style_demand',
        'b_restock_order',
        'b_request_record',
        'b_public_style',
        'sys_spu',
        'shop_delete_requests' // Added this just in case
    ];

    for (const table of tablesToCheck) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            // Ignore if table doesn't exist (e.g. shop_delete_requests might be missing)
            if (error.code !== '42P01') console.log(`Table ${table} check error:`, error.message);
        } else {
            console.log(`Table '${table}' row count: ${count}`);
        }
    }

    // 3. Verify specifically for Test Accounts
    // We assume test accounts are the ones in sys_shop
    console.log('\n--- Checking Shops ---');
    const { data: shops } = await supabase.from('sys_shop').select('id, shop_name');

    if (shops && shops.length > 0) {
        console.log(`Found ${shops.length} shops.`);
        for (const shop of shops) {
            // Check style demand count for this shop
            const { count } = await supabase
                .from('b_style_demand')
                .select('*', { count: 'exact', head: true })
                .eq('shop_id', shop.id);

            if (count && count > 0) {
                console.log(`WARNING: Shop '${shop.shop_name}' still has ${count} styles!`);
            }
        }
    } else {
        console.log('No shops found.');
    }

    console.log('\nVerification Complete.');
}

verifyData();
