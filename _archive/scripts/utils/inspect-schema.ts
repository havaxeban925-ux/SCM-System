
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspect() {
    const tables = ['b_request_record', 'b_quote_order'];

    for (const table of tables) {
        console.log(`\n--- Inspecting ${table} ---`);
        const { data: rows, error: fetchError } = await supabase.from(table).select('*').limit(1);

        if (fetchError) {
            console.log(`Error fetching ${table}:`, fetchError.message);
        } else if (rows && rows.length > 0) {
            console.log(`Keys in ${table}:`, JSON.stringify(Object.keys(rows[0])));
        } else {
            console.log(`No rows found in ${table}. Cannot inspect keys via data select.`);
            // Try to find if we can insert a dummy to see error?
        }
    }
}

inspect();
