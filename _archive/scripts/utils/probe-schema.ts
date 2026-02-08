
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function probe() {
    console.log('Probing b_quote_order...');
    // Try to insert empty object to trigger "null value in column..."
    const { error } = await supabase.from('b_quote_order').insert({});
    if (error) {
        console.log('Error:', error.message);
        console.log('Details:', error.details);
        console.log('Hint:', error.hint);
    } else {
        console.log('Insert success?!');
    }
}

probe();
