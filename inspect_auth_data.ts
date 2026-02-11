
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();
config({ path: '.env.local', override: true });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function inspectAuth() {
    console.log('--- Inspecting Auth Tables ---');

    // 1. Users
    const { data: users, error: userError } = await supabase
        .from('sys_user')
        .select('id, username, shop_name, role, status');

    if (userError) console.error('Error fetching users:', userError.message);
    else {
        console.log(`Found ${users?.length} users:`);
        console.table(users);
    }

    // 2. Shops
    const { data: shops, error: shopError } = await supabase
        .from('sys_shop')
        .select('id, shop_name, key_id, phone');

    if (shopError) console.error('Error fetching shops:', shopError.message);
    else {
        console.log(`Found ${shops?.length} shops:`);
        console.table(shops);
    }
}

inspectAuth();
