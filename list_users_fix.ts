
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log('--- Current Users in sys_user ---');
    const { data: users, error } = await supabase.from('sys_user').select('id, username, role, status');
    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.table(users);
    }

    console.log('\n--- Current Shops in sys_shop ---');
    const { data: shops, error: shopError } = await supabase.from('sys_shop').select('id, shop_name, role, key_id');
    if (shopError) {
        console.error('Error fetching shops:', shopError);
    } else {
        console.table(shops);
    }
}

listUsers();
