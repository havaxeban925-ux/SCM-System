
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function finalVerify() {
    const tables = [
        'b_quote_order',
        'b_request_record',
        'b_style_demand',
        'b_public_style',
        'b_restock_logistics',
        'b_restock_order',
        'sys_shop'
    ];

    for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`${table}: ${count} rows`);
    }

    const { data: users } = await supabase.from('sys_user').select('username, role');
    console.log(`sys_user: ${users?.length} users remaining`);
    users?.forEach(u => console.log(` - ${u.username} (${u.role})`));
}

finalVerify();
