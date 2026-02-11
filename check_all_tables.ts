
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function verboseCheck() {
    const tables = ['sys_user', 'users', 'check_user']; // Skipping b_buyer for now to isolate

    for (const t of tables) {
        console.log(`--- Checking table: ${t} ---`);
        const { data, error } = await supabase.from(t).select('*').limit(5);
        if (error) {
            console.log(`Error: ${error.message}`);
        } else {
            console.log(`Rows: ${data?.length}`);
            if (data && data.length > 0) {
                console.log('Columns:', Object.keys(data[0]).join(', '));
                // Check if our user is here
                const { data: found } = await supabase.from(t).select('*')
                    .or(`username.ilike.%阿秋%,name.ilike.%阿秋%`) // try ilike and broad match
                    .limit(1);
                if (found && found.length > 0) console.log('Potential MATCH:', found);
            }
        }
    }
}

verboseCheck();
