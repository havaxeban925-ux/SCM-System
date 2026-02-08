
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env directly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('--- Verifying b_style_demand Schema and Data ---');

    // 1. Check one row to see keys
    const { data: sample, error: sampleError } = await supabase
        .from('b_style_demand')
        .select('*')
        .limit(1);

    if (sampleError) {
        console.error('Error fetching sample:', sampleError);
    } else if (sample && sample.length > 0) {
        console.log('Available Columns:', Object.keys(sample[0]));
        const hasRefLink = 'ref_link' in sample[0];
        const hasHandlerName = 'handler_name' in sample[0];
        const hasCreatedBy = 'created_by' in sample[0];
        console.log(`Column check: ref_link=${hasRefLink}, handler_name=${hasHandlerName}, created_by=${hasCreatedBy}`);
    } else {
        console.log('Table is empty, cannot verify columns via select.');
    }

    // 2. Check the specific "Test 2" style
    // We'll search for the most recent items
    const { data: recent, error: recentError } = await supabase
        .from('b_style_demand')
        .select('id, name, ref_link, handler_name, created_by, created_at, push_type, shop_name')
        .order('created_at', { ascending: false })
        .limit(10);

    if (recentError) {
        console.error('Error fetching recent:', recentError);
    } else {
        console.log('\n--- Recent 10 Records in b_style_demand ---');
        console.table(recent);
    }

    // 3. Check b_public_style recent
    const { data: publicRecent, error: publicError } = await supabase
        .from('b_public_style')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (publicError) {
        console.error('Error fetching public recent:', publicError);
    } else {
        console.log('\n--- Recent 5 Records in b_public_style ---');
        console.table(publicRecent);
    }
}

verify();
