
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- sys_user ---');
    const { data: users } = await supabase.from('sys_user').select('*');
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- sys_shop ---');
    const { data: shops } = await supabase.from('sys_shop').select('*');
    console.log(JSON.stringify(shops, null, 2));
}

checkData().catch(console.error);
