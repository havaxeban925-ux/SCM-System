
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkUser() {
    console.log("Checking user '阿秋'...");

    // Check by username (assuming username column exists and is used for login)
    // Or check by name if '阿秋' is the name.
    // Usually login uses 'username' or 'phone'.

    // Let's check both 'username' and 'name'
    const { data: users, error } = await supabase
        .from('sys_user')
        .select('*')
        .select('*').limit(20);

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (users && users.length > 0) {
        console.log('User found:', users);
        users.forEach(u => {
            console.log(`ID: ${u.id}, Username: ${u.username}, Name: ${u.name}, Role: ${u.role}, Password(hash): ${u.password?.substring(0, 10)}...`);
        });
    } else {
        console.log("User '阿秋' not found in sys_user table.");
    }
}

checkUser();
