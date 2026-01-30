
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDataCounts() {
    console.log('🔍 Verifying Data Counts...');

    const tables = [
        'b_style_demand',
        'b_public_style',
        'b_request_record',
        'b_quote_order',
        'b_restock_order'
    ];

    let allZero = true;

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`❌ Error checking ${table}:`, error.message);
            allZero = false;
        } else {
            if (count !== 0) {
                console.error(`❌ ${table} has ${count} rows (Expected 0)`);
                allZero = false;
            } else {
                console.log(`✅ ${table}: 0 rows`);
            }
        }
    }

    if (allZero) {
        console.log('\n🎉 All tables are empty. Cleanup verified.');
    } else {
        console.error('\n⚠️ Some tables still contain data!');
        process.exit(1);
    }
}

verifyDataCounts().catch(console.error);
