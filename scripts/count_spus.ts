
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function countSpus() {
    const { count, error } = await supabase
        .from('sys_spu')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Count Failed:', error);
    } else {
        console.log('Total SPUs:', count);
    }
}

countSpus();
