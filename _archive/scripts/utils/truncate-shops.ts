import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function truncate() {
    console.log('Deleting all shops...');
    // Delete all rows (id is not null)
    const { count, error } = await supabase
        .from('sys_shop')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything usually requires a filter in Supabase unless RLS/Policy allows.
    // Assuming neq 0 uuid works as a "Delete All".

    if (error) {
        console.error('Delete error:', error);
    } else {
        console.log(`Deleted ${count} records.`);
    }
}

truncate();
