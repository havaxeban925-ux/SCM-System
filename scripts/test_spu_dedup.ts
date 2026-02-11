
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// using global fetch

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testSpuDedup() {
    console.log('Testing SPU Deduplication...');

    const imageUrl = `https://test.com/img-dedup-${Date.now()}.jpg`;
    const commonSpu = 'DUPLICATE-SPU-CODE';
    const ids = [];

    // Insert 3 records: 2 with same SPU, 1 different
    const records = [commonSpu, commonSpu, 'UNIQUE-SPU-CODE'];

    for (const code of records) {
        const { data, error } = await supabase.from('sys_spu').insert({
            spu_code: code,
            image_url: imageUrl,
            created_at: new Date().toISOString()
        }).select().single();
        if (data) ids.push(data.id);
    }
    console.log(`Created ${ids.length} test records.`);

    try {
        const BASE = 'http://127.0.0.1:3001';
        const res = await fetch(`${BASE}/api/spu?pageSize=100`);
        const json = await res.json();

        if (json.data) {
            const group = json.data.find((item: any) => item.image_url === imageUrl);
            if (group) {
                console.log('Found Group:', group);
                const codes = group.spu_code.split(' ');
                console.log('SPU Codes:', codes);
                if (codes.length === 2 && codes.includes(commonSpu) && codes.includes('UNIQUE-SPU-CODE')) {
                    console.log('SUCCESS: Deduplicated correctly!');
                } else {
                    console.error('FAILURE: Expected 2 unique codes, got', codes.length);
                }
            } else {
                console.error('FAILURE: Group not found');
            }
        }

    } catch (err) {
        console.error('Exception:', err);
    } finally {
        if (ids.length > 0) {
            await supabase.from('sys_spu').delete().in('id', ids);
            console.log('Cleanup Success');
        }
    }
}

testSpuDedup();
