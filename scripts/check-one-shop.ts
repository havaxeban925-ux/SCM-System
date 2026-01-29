import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSpecificShop() {
    // Check key_id and level for the shop from screenshot
    // Shop ID: 634418224581687
    const { data: shops } = await supabase
        .from('sys_shop')
        .select('*')
        .eq('shop_code', '634418224581687');

    console.log('Shop Record:', JSON.stringify(shops, null, 2));

    // Also check one that looks garbled
    // It seems "cecefushi" is the name.
}
checkSpecificShop();
