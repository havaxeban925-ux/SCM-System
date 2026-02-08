
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey.length);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Starting query...');
    const shopId = '5efe3196-77ce-470c-9662-169440d3a484';

    try {
        const { count, error } = await supabase
            .from('b_style_demand')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shopId)
            .in('status', ['locked', 'developing']);

        if (error) {
            console.error('Query error:', error);
        } else {
            console.log('Success!', count);
        }
    } catch (err) {
        console.error('Catch error:', err);
    }
}

test();
