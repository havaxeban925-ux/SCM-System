
import { getSupabase } from '../server/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Use process.cwd() to resolve path, assuming running from project root
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const supabase = getSupabase();

async function cleanupKeys() {
    console.log('Starting cleanup of "N" level keys...');

    try {
        // 1. Find all shops with level 'N' (or NULL if you want to include them, but user said 'N')
        const { data: shops, error: findError } = await supabase
            .from('sys_shop')
            .select('id, shop_name')
            .eq('level', 'N');

        if (findError) {
            throw new Error(`Error finding shops: ${findError.message}`);
        }

        if (!shops || shops.length === 0) {
            console.log('No shops found with level "N".');
            return;
        }

        const shopIds = shops.map(s => s.id);
        console.log(`Found ${shops.length} shops to delete.`);

        const BATCH_SIZE = 50;
        for (let i = 0; i < shopIds.length; i += BATCH_SIZE) {
            const batch = shopIds.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${i / BATCH_SIZE + 1} (${batch.length} items)...`);

            // 2. Delete related b_style_demand (styles)
            const { error: styleError, count: styleCount } = await supabase
                .from('b_style_demand')
                .delete({ count: 'exact' })
                .in('shop_id', batch);

            if (styleError) {
                console.error(`Error deleting styles for batch starting at ${i}:`, styleError.message);
                continue; // Try next batch
            }
            console.log(`  Deleted ${styleCount} styles.`);

            // 3. Delete related b_restock_order (restocks)
            const { error: restockError, count: restockCount } = await supabase
                .from('b_restock_order')
                .delete({ count: 'exact' })
                .in('shop_id', batch);

            if (restockError) {
                console.error(`Error deleting restock orders for batch starting at ${i}:`, restockError.message);
                continue;
            }
            console.log(`  Deleted ${restockCount} restock orders.`);

            // 4. Delete the shops themselves
            const { error: shopError, count: shopCount } = await supabase
                .from('sys_shop')
                .delete({ count: 'exact' })
                .in('id', batch);

            if (shopError) {
                console.error(`Error deleting shops for batch starting at ${i}:`, shopError.message);
            } else {
                console.log(`  Deleted ${shopCount} shops.`);
            }
        }

        console.log('Cleanup process completed.');

    } catch (err: any) {
        console.error('Cleanup failed:', err.message);
    }
}

cleanupKeys();
