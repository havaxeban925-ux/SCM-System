
import { getSupabase } from '../server/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Use process.cwd() to resolve path, assuming running from project root
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabase = getSupabase();

async function checkUsers() {
    try {
        const { data: users, error } = await supabase
            .from('sys_user')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        console.log('Recent Users:', JSON.stringify(users, null, 2));

        // Also check if these users have shops
        if (users && users.length > 0) {
            const shopNames = users.map(u => u.shop_name).filter(n => n);
            const { data: shops, error: shopError } = await supabase
                .from('sys_shop')
                .select('shop_name, id')
                .in('shop_name', shopNames);

            if (shopError) throw shopError;
            console.log('Existing Shops for these users:', JSON.stringify(shops, null, 2));
        }

    } catch (err: any) {
        console.error('Check failed:', err.message);
    }
}

checkUsers();
