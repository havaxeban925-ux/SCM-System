
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

async function debugSpu() {
    console.log('Debugging SPU Content...');

    // 1. Check DB
    const { data: dbData, error } = await supabase
        .from('sys_spu')
        .select('*')
        .limit(10);

    console.log('Raw DB Data:', JSON.stringify(dbData, null, 2));

    // 2. Check API
    try {
        const BASE = 'http://127.0.0.1:3001';
        const res = await fetch(`${BASE}/api/spu?pageSize=10`);
        const json = await res.json();
        console.log('API Response:', JSON.stringify(json, null, 2));
    } catch (err) {
        console.error('API Error:', err);
    }
}

debugSpu();
