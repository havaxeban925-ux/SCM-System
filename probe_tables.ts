
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function listAllTables() {
    // Try to list tables by querying a known table and looking at error hint if any, 
    // or just try to select * from information_schema.tables (usually requires owner privileges)

    // Attempt 1: direct query (rarely works with client lib unless rpc is set up)
    // const { data, error } = await supabase.rpc('get_tables'); 

    // Attempt 2: Probe common names again
    const candidates = ['sys_user', 'users', 'check_user', 'b_buyer', 'b_merchant', 'sys_role'];

    for (const t of candidates) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error || error.code !== '42P01') {
            // 42P01 = undefined_table
            // If code is not 42P01, table likely exists (even if permission denied)
            console.log(`Table '${t}' status: ${error ? error.code : 'OK'}`);
        } else {
            console.log(`Table '${t}' does NOT exist.`);
        }
    }
}

listAllTables();
