
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function createUser() {
    const username = '秋测试';
    const password = '123456';
    const role = 'buyer'; // Defaulting to buyer

    // Check if exists first
    const { data: existing } = await supabase
        .from('sys_user')
        .select('*')
        .eq('username', username)
        .single();

    if (existing) {
        console.log(`User '${username}' already exists. Updating password...`);
        const { error } = await supabase
            .from('sys_user')
            .update({ password: password })
            .eq('id', existing.id);

        if (error) console.error('Error updating password:', error);
        else console.log('Password updated successfully.');
        return;
    }

    // Create new
    const { data, error } = await supabase
        .from('sys_user')
        .insert({
            username: username,
            password: password,
            role: role,
            status: 'approved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log(`User created successfully! ID: ${data.id}, Username: ${data.username}, Role: ${data.role}`);
    }
}

createUser();
