
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config();
config({ path: '.env.local', override: true });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function forceCleanup() {
    console.log('--- STARTING FORCE CLEANUP ---');
    console.log('This will delete ALL data from: b_style_demand, b_restock_order, b_request_record, b_public_style');

    // 1. Clean b_request_record (Pricing/Anomaly)
    console.log('Cleaning b_request_record...');
    const { error: err1, count: count1 } = await supabase
        .from('b_request_record')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (err1) console.error('Error cleaning b_request_record:', err1.message);
    else console.log(`Deleted ${count1} records from b_request_record`);

    // 2. Clean b_restock_order (Restock)
    console.log('Cleaning b_restock_order...');
    const { error: err2, count: count2 } = await supabase
        .from('b_restock_order')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error('Error cleaning b_restock_order:', err2.message);
    else console.log(`Deleted ${count2} records from b_restock_order`);

    // 0. Clean sys_spu (FK dependency)
    console.log('Cleaning sys_spu (FK dependency)...');
    const { error: err0, count: count0 } = await supabase
        .from('sys_spu')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (err0) console.error('Error cleaning sys_spu:', err0.message);
    else console.log(`Deleted ${count0} records from sys_spu`);

    // 3. Clean b_style_demand (Style Orders - Private/Accepted Public)
    console.log('Cleaning b_style_demand...');
    const { error: err3, count: count3 } = await supabase
        .from('b_style_demand')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) console.error('Error cleaning b_style_demand:', err3.message);
    else console.log(`Deleted ${count3} records from b_style_demand`);

    // 4. Clean b_public_style (Public Pool)
    console.log('Cleaning b_public_style...');
    const { error: err4, count: count4 } = await supabase
        .from('b_public_style')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (err4) console.error('Error cleaning b_public_style:', err4.message);
    else console.log(`Deleted ${count4} records from b_public_style`);

    console.log('--- CLEANUP COMPLETE ---');
}

forceCleanup();
