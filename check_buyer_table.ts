
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function checkBuyer() {
    // Check columns first (via error or dummy fetch)
    const { data: cols, error: colError } = await supabase.from('b_buyer').select('*').limit(1);
    if (colError) {
        console.error('Error fetching columns:', colError);
        return;
    }
    if (cols && cols.length > 0) {
        console.log('Columns in b_buyer:', Object.keys(cols[0]));
    } else {
        console.log('b_buyer is empty, columns unknown via data.');
    }

    // Attempt to search for '阿秋' in likely columns: name, username, nickname
    // Assuming 'name' exists based on common sense for a 'buyer' table
    const { data: buyers, error } = await supabase
        .from('b_buyer')
        .select('*')
        // .or(`name.eq.阿秋,username.eq.阿秋`); // Can't guess columns safely
        .limit(100);

    if (error) {
        console.error('Error fetching buyers:', error);
    } else {
        const found = buyers?.find((b: any) =>
            (b.name && b.name.includes('阿秋')) ||
            (b.username && b.username.includes('阿秋')) ||
            (b.nickname && b.nickname.includes('阿秋'))
        );
        if (found) {
            console.log('Found buyer:', found);
        } else {
            console.log('No buyer named 阿秋 found in first 100 rows.');
            if (buyers && buyers.length > 0) console.log('Sample buyer:', buyers[0]);
        }
    }
}

checkBuyer();
