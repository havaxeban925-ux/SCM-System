
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();
config({ path: '.env.local', override: true });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function cleanupTransactionalData() {
    console.log('--- STARTING TRANSACTIONAL DATA CLEANUP ---');
    console.log('Preserving: sys_shop, sys_user, b_tag');
    console.log('Deleting: Business flow data...');

    const tablesToClean = [
        'b_restock_logistics',
        'b_restock_order',
        'b_quote_order',
        'b_request_record',
        'sys_spu',
        'b_style_demand',
        'b_public_style',
        'sys_notification',
        'b_notification'
    ];

    for (const table of tablesToClean) {
        console.log(`Cleaning ${table}...`);
        try {
            const { error, count } = await supabase
                .from(table)
                .delete({ count: 'exact' })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

            if (error) {
                // Ignore "relation does not exist" errors, as some tables might not exist
                if (error.code === '42P01') {
                    console.log(`Table ${table} does not exist, skipping.`);
                } else {
                    console.error(`Error cleaning ${table}:`, error.message);
                }
            } else {
                console.log(`Deleted ${count} records from ${table}`);
            }
        } catch (err) {
            console.error(`Exception cleaning ${table}:`, err);
        }
    }

    console.log('--- CLEANUP COMPLETE ---');
}

cleanupTransactionalData();
