
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// 模拟 server/lib/supabase.ts 的逻辑
const getSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Supabase Key:', supabaseKey ? 'Set' : 'Missing');

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment');
    }
    return createClient(supabaseUrl, supabaseKey);
};

async function testFetchPending() {
    try {
        const supabase = getSupabase();
        console.log('Supabase client initialized.');

        console.log('Fetching pending users...');
        const { data, error } = await supabase
            .from('sys_user')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch pending error:', error);
        } else {
            console.log('Success! Data:', data);
        }

    } catch (err: any) {
        console.error('Unexpected error:', err.message);
        console.error(err);
    }
}

testFetchPending();
