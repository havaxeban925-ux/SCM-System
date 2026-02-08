
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkShop() {
    const shopId = '5efe3196-77ce-470c-9662-169440d3a484';
    console.log(`Querying shop with ID: ${shopId}`);

    const { data, error } = await supabase
        .from('sys_shop')
        .select('*')
        .eq('id', shopId)
        .single();

    if (error) {
        console.error('Error fetching shop:', error);
    } else {
        console.log('Shop Details:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkShop();
