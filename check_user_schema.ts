
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function listColumns() {
    // Insert a dummy row with invalid column to trigger error and see available columns (hacky but works fast)
    // Or just fetch one row and print keys

    const { data, error } = await supabase.from('sys_user').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));
    } else {
        console.log('Table empty, trying to insert dummy to see error');
        const { error: insertError } = await supabase.from('sys_user').insert({ username: 'temp_debug' });
        console.log('Insert Error (might show columns):', insertError);
    }
}

listColumns();
