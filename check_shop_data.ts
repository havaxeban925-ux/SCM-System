
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

async function checkShopData() {
    console.log('Checking Shop Data...');

    // 1. Check if 'shop_A' exists
    const { data: shops, error: shopError } = await supabase
        .from('b_shop') // Assuming table name, need to verify if it's 'b_shop' or 'shops'
        .select('*')
        .or(`shop_name.eq.shop_A, shop_name.eq.KEY1`);

    if (shopError) {
        console.error('Error fetching shops:', shopError);
    } else {
        console.log('Shops found:', shops);
    }

    // 2. Check keys if separate table
    // Inspect table list first or assume structure? 
    // Let's list all shops to see structure
    const { data: allShops } = await supabase.from('b_shop').select('*').limit(5);
    if (allShops && allShops.length > 0) {
        console.log('Sample shop record:', allShops[0]);
    } else {
        console.log('No shops found in b_shop');
    }
}

checkShopData();
