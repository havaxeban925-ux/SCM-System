
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function checkShop() {
    const { data: shops, error } = await supabase
        .from('sys_shop')
        .select('*')
        .ilike('shop_name', '%阿秋%')
        .limit(10);

    if (error) {
        console.error('Error fetching shops:', error);
    } else {
        if (shops && shops.length > 0) {
            console.log('Found shop with 阿秋:', shops);
        } else {
            console.log('No shop found with name like 阿秋');
        }
    }
}

checkShop();
