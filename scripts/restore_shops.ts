
import { getSupabase } from '../server/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Use process.cwd() to resolve path
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabase = getSupabase();

async function restoreShops() {
    console.log('Starting Shop Restoration...');

    try {
        // 1. Get all approved users with a shop_name
        const { data: users, error: userError } = await supabase
            .from('sys_user')
            .select('*')
            .eq('status', 'approved')
            .not('shop_name', 'is', null);

        if (userError) throw userError;

        if (!users || users.length === 0) {
            console.log('No approved users found.');
            return;
        }

        console.log(`Found ${users.length} approved users.`);

        // 2. Get all existing shops
        const { data: shops, error: shopError } = await supabase
            .from('sys_shop')
            .select('shop_name');

        if (shopError) throw shopError;

        const existingShopNames = new Set(shops?.map(s => s.shop_name) || []);

        // 3. Identify missing shops
        const missingShops = users.filter(u => !existingShopNames.has(u.shop_name));

        if (missingShops.length === 0) {
            console.log('All approved users have existing shops. No restoration needed.');
            return;
        }

        console.log(`Found ${missingShops.length} users with missing shops:`, missingShops.map(u => `${u.username}(${u.shop_name})`));

        // 4. Restore shops
        // Deduplicate by shop_name first (in case multiple users map to same shop)
        const uniqueShops = [...new Set(missingShops.map(u => u.shop_name))];

        for (const shopName of uniqueShops) {
            const { error: insertError } = await supabase
                .from('sys_shop')
                .insert({
                    shop_name: shopName,
                    role: 'FACTORY',
                    level: 'C', // Set to C to avoid being cleaned up as 'N'
                    key_id: `RESTORED_${Math.floor(Math.random() * 10000)}`,
                    phone: 'Restored Account' // Placeholder
                });

            if (insertError) {
                console.error(`Failed to restore shop "${shopName}":`, insertError.message);
            } else {
                console.log(`Successfully restored shop: "${shopName}" (Level: C)`);
            }
        }

    } catch (err: any) {
        console.error('Restoration failed:', err.message);
    }
}

restoreShops();
