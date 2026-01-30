
import { getSupabase } from '../server/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from root
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabase = getSupabase();

async function verifyShops() {
    console.log('Verifying shops in database...');
    // Log env vars (masked) to ensure we are hitting the right DB
    const url = process.env.SUPABASE_URL || '';
    console.log('Supabase URL:', url.substring(0, 20) + '...');

    const { data, error, count } = await supabase
        .from('sys_shop')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching shops:', error.message);
        return;
    }

    console.log(`Total Shops Found: ${count}`);
    if (data && data.length > 0) {
        console.log('Sample Shops:', data.slice(0, 5).map(s => ({
            name: s.shop_name,
            level: s.level,
            key: s.key_id
        })));
    } else {
        console.log('No shops found in the database.');
    }
}

verifyShops();
