
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkSchema() {
    console.log('Checking b_restock_order schema (via insert error probing)...');

    // Attempt to insert a dummy row with long values to trigger specific errors or just check success
    // Actually, we can just look at the error the user got: "value too long for type character varying(100)"
    // This usually implies a column has limit 100. 
    // Common columns: skc_code, order_no, etc.

    // Let's try to insert a row with a long skc_code and see if it fails
    const longString = 'a'.repeat(101);

    // We can't easily "describe table" via supabase-js unless using rpc.
    // So we will guess.

    console.log('Probing skc_code length...');
    const { error: e1 } = await supabase.from('b_restock_order').insert({
        shop_id: '00000000-0000-0000-0000-000000000000', // valid uuid format but dummy
        skc_code: longString,
        plan_quantity: 1,
        status: 'pending'
    });

    if (e1 && e1.message.includes('value too long')) {
        console.log('CONFIRMED: skc_code is limited to 100 chars.');
    } else if (e1) {
        console.log('Insert error for skc_code probe:', e1.message);
    } else {
        console.log('skc_code accepts > 100 chars (or insert succeeded unexpectedly).');
    }
}

checkSchema();
