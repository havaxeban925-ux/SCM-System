
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config();
config({ path: '.env.local', override: true });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkColumns() {
    console.log('Checking columns...');

    // Check b_style_demand
    const { data: styleData, error: styleError } = await supabase
        .from('b_style_demand')
        .select('ref_link')
        .limit(1);

    if (styleError) {
        console.log('b_style_demand.ref_link check failed:', styleError.message);
    } else {
        console.log('b_style_demand.ref_link exists.');
    }

    // Check b_public_style
    const { data: publicData, error: publicError } = await supabase
        .from('b_public_style')
        .select('ref_link')
        .limit(1);

    if (publicError) {
        console.log('b_public_style.ref_link check failed:', publicError.message);
    } else {
        console.log('b_public_style.ref_link exists.');
    }
}

checkColumns();
