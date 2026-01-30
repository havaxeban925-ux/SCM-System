
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findShop() {
    console.log('🔍 深度查找包含 "米子秋" 的商铺...');
    const { data: shops, error } = await supabase
        .from('sys_shop')
        .select('*')
        .or('shop_name.ilike.%米子秋%,key_id.ilike.%米子秋%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.table(shops);
    }
}

findShop().catch(console.error);
