import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
    const { data, error } = await supabase
        .from('sys_shop')
        .select('*')
        .eq('key_id', '周奇');

    if (error) console.error(error);
    else {
        console.log(`Found ${data.length} records for '周奇':`);
        if (data.length > 0) console.log(data[0].shop_name, data[0].key_id);
    }
}
check();
