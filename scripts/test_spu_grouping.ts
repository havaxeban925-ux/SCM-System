
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

async function testSpuGrouping() {
    console.log('Testing SPU Grouping API...');

    // 1. Create dummy SPUs with SAME image
    const ids = [];
    const imageUrl = `https://test.com/img-${Date.now()}.jpg`;

    for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase.from('sys_spu').insert({
            spu_code: `GRP-${i}-${Date.now()}`,
            image_url: imageUrl,
            created_at: new Date().toISOString()
        }).select().single();
        if (data) ids.push(data.id);
    }
    console.log(`Created ${ids.length} test SPUs with same image.`);

    try {
        // 2. Call the API
        const BASE = 'http://127.0.0.1:3001';
        const res = await fetch(`${BASE}/api/spu?pageSize=10`);
        const json = await res.json();

        console.log('API Total:', json.total);
        if (json.data) {
            const group = json.data.find((item: any) => item.image_url === imageUrl);
            if (group) {
                console.log('Found Group:', group);
                const codes = group.spu_code.split(' ');
                console.log('SPU Codes Count:', codes.length);
                if (codes.length === 3) {
                    console.log('SUCCESS: Grouped 3 SPUs!');
                } else {
                    console.error('FAILURE: Expected 3 SPUs, got', codes.length);
                }
            } else {
                console.error('FAILURE: Group not found');
            }
        }

    } catch (err) {
        console.error('Exception during test:', err);
    } finally {
        // 3. Cleanup
        if (ids.length > 0) {
            await supabase.from('sys_spu').delete().in('id', ids);
            console.log('Cleanup Success');
        }
    }
}

testSpuGrouping();
