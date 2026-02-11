
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load envs
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key Length:', supabaseKey?.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('Attempting to fetch from sys_shop...');
        const { data, error } = await supabase.from('sys_shop').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Failed:', error);
        } else {
            console.log('Connection Successful! Count:', data);
        }

        console.log('Attempting to fetch public styles...');
        const { data: publicStyles, error: publicError } = await supabase.from('b_public_style').select('id').limit(1);
        if (publicError) {
            console.error('Public Styles Fetch Failed:', publicError);
        } else {
            console.log('Public Styles Fetch Successful, count:', publicStyles?.length);
        }

    } catch (err) {
        console.error('Exception during connection test:', err);
    }
}

testConnection();
