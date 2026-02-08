import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkShopCode() {
    const { data } = await supabase
        .from('sys_shop')
        .select('shop_name, shop_code')
        .not('shop_code', 'is', null)
        .limit(5);

    console.log('Sample data with shop_code:', JSON.stringify(data, null, 2));
}
checkShopCode();
