
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debugUsers() {
    const { data, error } = await supabase.from('sys_user').select('*').limit(5);
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    console.log('User Sample:', JSON.stringify(data, null, 2));
}

debugUsers().catch(console.error);
