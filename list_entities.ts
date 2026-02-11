
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listEntities() {
    console.log('--- Users ---');
    const { data: users, error: userError } = await supabase.from('sys_user').select('*');
    if (userError) console.error(userError);
    else console.table(users);

    console.log('--- Shops ---');
    const { data: shops, error: shopError } = await supabase.from('sys_shop').select('*');
    if (shopError) console.error(shopError);
    else console.table(shops);
}

listEntities();
