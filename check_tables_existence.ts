
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function listTables() {
    // There isn't a direct "list tables" in supabase-js client without rpc or specific permissions usually.
    // But we can try to query `information_schema`.
    // Note: This often requires higher privileges or might not work via standard client if not exposed.
    // Alternatively, we can just guess common names or rely on previous knowledge.
    // Let's try to query a few likely suspects: 'b_buyer', 'b_merchant', 'sys_role'.

    const tables = ['b_buyer', 'b_merchant', 'sys_role', 'users', 'admin_users'];

    for (const t of tables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table exists: ${t}`);
        } else {
            // console.log(`Table check failed for ${t}: ${error.code}`); 
            // 42P01 means undefined table
        }
    }
}

listTables();
