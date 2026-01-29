import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import * as crypto from 'crypto';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function clean() {
    console.log('Identifying ghost records...');

    // 1. Get Valid IDs from CSV
    const buffer = fs.readFileSync('./商家情况.csv');
    const csv = iconv.decode(buffer, 'gbk');
    const lines = csv.split(/\r?\n/).slice(1);

    const validIds = new Set<string>();

    for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',');
        if (parts.length < 3) continue;
        let shop_id = parts[2].trim();
        shop_id = shop_id.replace(/\s+/g, '').replace(/[^0-9a-zA-Z]/g, '');
        if (shop_id) {
            const uuid = generateUUID(shop_id);
            validIds.add(uuid);
        }
    }

    console.log(`Valid IDs from CSV: ${validIds.size}`);

    // 2. Fetch All DB IDs
    let allDbShops: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('sys_shop').select('id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        allDbShops = allDbShops.concat(data);
        if (data.length < 1000) break;
        page++;
    }
    console.log(`Total DB Shops: ${allDbShops.length}`);

    // 3. Find Ghosts
    const ghosts = allDbShops.filter(s => !validIds.has(s.id));
    console.log(`Ghost Shops to delete: ${ghosts.length}`);

    if (ghosts.length === 0) return;

    const ghostIds = ghosts.map(g => g.id);

    // 4. Delete Dependencies (Batch)
    // Tables: b_style_demand, b_pricing_application, b_anomaly_application
    const tables = ['b_style_demand', 'b_pricing_application', 'b_anomaly_application', 'b_restock_order'];

    for (const table of tables) {
        console.log(`Cleaning ${table}...`);
        // chunk delete
        for (let i = 0; i < ghostIds.length; i += 100) {
            const batch = ghostIds.slice(i, i + 100);
            await supabase.from(table).delete().in('shop_id', batch);
        }
    }

    // 5. Delete Shops
    console.log('Deleting Shops...');
    let deleted = 0;
    for (let i = 0; i < ghostIds.length; i += 100) {
        const batch = ghostIds.slice(i, i + 100);
        const { error } = await supabase.from('sys_shop').delete().in('id', batch);
        if (!error) {
            deleted += batch.length;
            process.stdout.write('.');
        } else {
            console.error(error.message);
        }
    }
    console.log(`\nDeleted ${deleted} ghost shops.`);
}

function generateUUID(input: string): string {
    const hash = crypto.createHash('md5').update(input).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

clean();
