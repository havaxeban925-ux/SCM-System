
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspect() {
    const table = 'b_request_record';
    console.log(`Inspecting ${table}`);
    const { data: rows, error } = await supabase.from(table).select('*').limit(1);
    if (rows && rows.length > 0) {
        console.log('KEYS:\n' + Object.keys(rows[0]).join('\n'));
    } else {
        console.log('No rows or error:', error ? error.message : 'Empty');
    }
}

inspect();
