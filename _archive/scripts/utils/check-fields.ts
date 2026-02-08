import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkPhone() {
    const { data, count } = await supabase
        .from('sys_shop')
        .select('*', { count: 'exact' })
        .not('phone', 'is', null);

    console.log(`Rows with phone: ${count}`);
    if (data && data.length > 0) {
        console.log('Sample:', data[0]);
    } else {
        console.log('No rows with phone found.');
    }

    const { data: roleData } = await supabase
        .from('sys_shop')
        .select('role')
        .neq('role', 'FACTORY')
        .limit(5);
    console.log('Non-FACTORY roles:', roleData);
}
checkPhone();
