
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function listTables() {
    console.log('Listing tables...');
    // Without direct SQL access, we can't easily list tables via standard client
    // UNLESS we use the `rpc` if available, OR try to query specific known tables.

    // However, if we can't run SQL, we can try to guess or reuse the `add_push_history_columns.sql` mechanism if the user was running it manually.
    // But since I am an agent, I should try to be helpful.

    // Let's try to query likely tables to see if they exist.
    const tablesToCheck = ['sys_shop', 'b_shop', 'b_restock_order', 'sys_user', 'b_action_log'];

    for (const table of tablesToCheck) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table '${table}': Error - ${error.message}`);
        } else {
            console.log(`Table '${table}': Exists`);
        }
    }
}

listTables();
