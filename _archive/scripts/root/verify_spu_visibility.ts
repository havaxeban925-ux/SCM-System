
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySpuVisibility() {
    console.log('--- Checking Database for spu_verify records ---');
    try {
        const { data: dbData, error: dbError } = await supabase
            .from('b_style_demand')
            .select('id, name, status, development_status')
            .eq('development_status', 'spu_verify');

        if (dbError) {
            console.error('DB Error:', dbError);
        } else {
            console.log(`Found ${dbData?.length || 0} records with development_status = "spu_verify" in DB:`);
            console.table(dbData);
        }
    } catch (e) {
        console.error('DB Check Failed:', e);
    }

    console.log('\n--- Checking API /api/development ---');
    try {
        // Node 18+ has native fetch
        const res = await fetch('http://localhost:3001/api/development?pageSize=100');
        if (!res.ok) {
            console.error(`API Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error('Response:', text);
        } else {
            const json = await res.json();
            const items = json.data || [];
            console.log(`API returned ${items.length} records.`);

            const spuVerifyItems = items.filter(i => i.development_status === 'spu_verify');
            console.log(`Of which, ${spuVerifyItems.length} have development_status = "spu_verify".`);
            if (spuVerifyItems.length > 0) {
                console.table(spuVerifyItems.map(i => ({
                    id: i.id,
                    name: i.name,
                    status: i.status,
                    dev_status: i.development_status
                })));
            } else {
                console.log('No spu_verify items found in API response.');
            }
        }
    } catch (e) {
        console.error('API Check Failed:', e);
    }
}

verifySpuVisibility();
