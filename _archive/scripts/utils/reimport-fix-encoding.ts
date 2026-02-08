import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import * as crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importShops() {
    console.log('Reading CSV with GBK encoding...');
    const buffer = fs.readFileSync('./商家情况.csv');
    const csv = iconv.decode(buffer, 'gbk');
    const lines = csv.split(/\r?\n/).filter(line => line.trim());

    // Skip header
    const dataLines = lines.slice(1);

    // Parse
    const rawShops = dataLines.map((line, idx) => {
        const parts = line.split(',');
        if (parts.length < 4) return null;

        let [key_id, level, shop_id, shop_name] = parts.map(p => p.trim());

        shop_id = shop_id.replace(/\s+/g, '').replace(/[^0-9a-zA-Z]/g, '');
        if (!shop_id) return null;

        const uuid = generateUUID(shop_id);

        return {
            id: uuid,
            shop_name: shop_name || `店铺${shop_id}`,
            phone: null,
            role: 'Factory',
            key_id: key_id,
            level: level as any,
            shop_code: shop_id
        };
    }).filter(Boolean) as any[];

    // Deduplicate in memory
    const uniqueMap = new Map();
    for (const shop of rawShops) {
        uniqueMap.set(shop.id, shop);
    }
    const shops = Array.from(uniqueMap.values());

    console.log(`Original rows: ${rawShops.length}, Unique IDs: ${shops.length}`);

    const batchSize = 100;
    let success = 0;
    let errors = 0;

    for (let i = 0; i < shops.length; i += batchSize) {
        const batch = shops.slice(i, i + batchSize);
        const { error } = await supabase
            .from('sys_shop')
            .upsert(batch, { onConflict: 'id' });

        if (error) {
            console.error(`Batch error:`, error.message);
            errors += batch.length;
        } else {
            success += batch.length;
            process.stdout.write('.');
        }
    }

    console.log(`\nImport/Update Complete! Success: ${success}, Errors: ${errors}`);
}

function generateUUID(input: string): string {
    const hash = crypto.createHash('md5').update(input).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

importShops().catch(console.error);
