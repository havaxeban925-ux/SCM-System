
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin updates if possible, or anon if RLS allows

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MAPPING: Record<string, string> = {
    'shop_A': 'KEY1',
    'shop_B': 'KEY2',
    'shop_C': 'KEY3',
    'shop_D': 'KEY4',
    'SHOP_A': 'KEY1',
    'SHOP_B': 'KEY2',
    'SHOP_C': 'KEY3',
    'SHOP_D': 'KEY4'
};
// Also handle potential case variations or if they are just A, B, C, D? 
// The user said "shop_A B C D", assuming key_id.

async function updateKeys() {
    console.log('Starting key update...');

    // 1. Check current shops
    const { data: shops, error } = await supabase.from('sys_shop').select('id, key_id, shop_name');
    if (error) {
        console.error('Error fetching shops:', error);
        return;
    }

    console.log('Current Shops:', shops);

    for (const shop of shops || []) {
        // Check if key_id matches any target
        // Try strict match first
        let newKey = MAPPING[shop.key_id];

        // If not found, maybe the key is just 'A', 'B'? 
        if (!newKey) {
            if (shop.key_id === 'A') newKey = 'KEY1';
            if (shop.key_id === 'B') newKey = 'KEY2';
            if (shop.key_id === 'C') newKey = 'KEY3';
            if (shop.key_id === 'D') newKey = 'KEY4';
        }

        if (newKey) {
            console.log(`Updating shop ${shop.id} (${shop.shop_name}): ${shop.key_id} -> ${newKey}`);
            const { error: updateError } = await supabase
                .from('sys_shop')
                .update({ key_id: newKey })
                .eq('id', shop.id);

            if (updateError) {
                console.error(`Failed to update shop ${shop.id}:`, updateError);
            } else {
                console.log(`Success.`);
            }
        } else {
            console.log(`Skipping shop ${shop.id} (${shop.shop_name}): key_id ${shop.key_id} not in target list.`);
        }
    }
    console.log('Done.');
}

updateKeys();
