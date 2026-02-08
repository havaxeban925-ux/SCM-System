
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    const { data: users } = await supabase.from('sys_user').select('*');
    const buyers = users.filter(u => u.role === 'admin' || u.role === 'buyer' || u.username.includes('admin') || u.username.includes('buyer'));
    console.log('--- Buyer/Admin Accounts ---');
    console.log(JSON.stringify(buyers, null, 2));

    const coreMerchants = users.filter(u => u.username.startsWith('1234567890'));
    console.log('\n--- Core Merchant Accounts ---');
    console.log(JSON.stringify(coreMerchants, null, 2));

    const others = users.filter(u => !u.username.startsWith('1234567890') && u.role !== 'admin');
    console.log('\n--- Other (Mirror/Test) Accounts Count: ' + others.length + ' ---');
    if (others.length > 0) {
        console.log('Samples:', JSON.stringify(others.slice(0, 3), null, 2));
    }
}

checkUsers().catch(console.error);
