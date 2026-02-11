
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

// Use service key if available for better permissions, otherwise anon key
const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function checkSchema() {
    console.log('Checking b_restock_order schema...');

    // Check columns in b_restock_order
    const { data: columns, error } = await supabase
        .from('b_restock_order')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting from b_restock_order:', error);
    } else {
        console.log('Successfully selected from b_restock_order. Keys in returned object:', columns && columns.length > 0 ? Object.keys(columns[0]) : 'No rows found, cannot infer keys from data');
    }

    // Attempt to insert a dummy record to force error if column missing, or use RPC if available
    // Better: Query information_schema if possible, but standard client might not allow it easily without RPC.
    // However, the error "Could not find the 'order_no' column... in the schema cache" strongly suggests it's missing.

    // Let's try to add it via raw SQL if we can, or just report back.
    // But first, let's verify if we can see it in a sample row or if insert fails.
}

checkSchema();
