
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: shops } = await supabase.from('sys_shop').select('*');
    const { data: users } = await supabase.from('sys_user').select('*');
    fs.writeFileSync('final_dump.json', JSON.stringify({ shops, users }, null, 2));
    console.log('Dump completed to final_dump.json');
}

run();
