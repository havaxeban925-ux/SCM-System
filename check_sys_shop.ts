
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

async function checkShop() {
    console.log('Checking sys_shop for shop_A...');

    const { data: shops, error } = await supabase
        .from('sys_shop')
        .select('*')
        .ilike('shop_name', '%shop_A%');

    if (error) {
        console.error('Error fetching shops:', error);
    } else {
        console.log('Shops found for "shop_A":', shops);
    }

    // Also check for KEY1
    const { data: keys, error: keyError } = await supabase
        .from('sys_shop')
        .select('*')
        .eq('key_id', 'KEY1');

    if (keyError) {
        console.error('Error fetching keys:', keyError);
    } else {
        console.log('Shops with KEY1:', keys);
    }
}

checkShop();
