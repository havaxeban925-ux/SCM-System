
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

async function testSpuConfirm() {
    console.log('Testing SPU Confirmation API...');

    // 1. Create a dummy style
    const testSpuCode = 'TEST-SPU-' + Date.now();
    const { data: style, error } = await supabase.from('b_style_demand').insert({
        // project_name: 'Test Project', // Column might not exist
        // item_name: 'Test Item',       // Column might not exist
        back_spu: testSpuCode,
        status: 'developing',
        development_status: 'drafting'
    }).select().single();

    if (error || !style) {
        console.error('Failed to create test style:', error);
        return;
    }
    console.log('Created test style:', style.id);

    try {
        // 2. Call the API
        const BASE = 'http://127.0.0.1:3001';
        console.log(`Calling POST ${BASE}/api/development/${style.id}/spu-confirm...`);

        const res = await fetch(`${BASE}/api/development/${style.id}/spu-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
            console.error('API Call Failed:', res.status, await res.text());
        } else {
            console.log('API Call Success:', await res.json());

            // 3. Verify sys_spu
            const { data: spuData, error: spuError } = await supabase
                .from('sys_spu')
                .select('*')
                .eq('spu_code', testSpuCode)
                .single();

            if (spuError || !spuData) {
                console.error('Verification Failed: SPU not found in DB', spuError);
            } else {
                console.log('Verification Success: SPU found in DB', spuData);
            }
        }

    } catch (err) {
        console.error('Exception during test:', err);
    } finally {
        // 4. Cleanup
        console.log('Cleaning up...');
        await supabase.from('sys_spu').delete().eq('spu_code', testSpuCode);
        await supabase.from('b_style_demand').delete().eq('id', style.id);
    }
}

testSpuConfirm();
