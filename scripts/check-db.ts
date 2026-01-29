import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
    const { data } = await supabase.from('sys_shop').select('*').limit(1);
    console.log(JSON.stringify(data, null, 2));
}
check();
