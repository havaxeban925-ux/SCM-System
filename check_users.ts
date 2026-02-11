
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();
config({ path: '.env.local', override: true });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkUsers() {
    console.log('Checking Users and Shops...');

    // Check sys_user
    const { count: userCount, error: userError } = await supabase
        .from('sys_user')
        .select('*', { count: 'exact', head: true });

    if (userCount !== null) console.log(`sys_user count: ${userCount}`);
    else console.log('sys_user check error/empty:', userError?.message);

    // Check sys_shop again
    const { count: shopCount, error: shopError } = await supabase
        .from('sys_shop')
        .select('*', { count: 'exact', head: true });

    if (shopCount !== null) console.log(`sys_shop count: ${shopCount}`);
    else console.log('sys_shop check error/empty:', shopError?.message);
}

checkUsers();
