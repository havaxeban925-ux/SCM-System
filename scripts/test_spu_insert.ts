
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testSpuInsert() {
    console.log('Testing SPU Insert...');
    const testCode = 'TEST-SPU-' + Date.now();

    // 1. Insert
    const { data, error } = await supabase.from('sys_spu').insert({
        spu_code: testCode,
        // style_demand_id: '...', // Optional constraint? Let's see if it fails on null FK
        // shop_id: '...' 
    }).select();

    if (error) {
        console.error('Insert Failed:', error);
    } else {
        console.log('Insert Success:', data);
        // 2. Delete
        await supabase.from('sys_spu').delete().eq('spu_code', testCode);
        console.log('Cleanup Success');
    }
}

testSpuInsert();
