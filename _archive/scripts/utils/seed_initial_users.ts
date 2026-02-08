
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function seedInitialUsers() {
    console.log('🌱 Seeding initial users...');

    // 1. Create shops first
    const shops = [
        { shop_name: '示例官方旗舰店', role: 'FACTORY', key_id: 'KEY8888', shop_code: 'SHOP001', level: 'S' },
        { shop_name: '新店测试', role: 'FACTORY', key_id: 'KEY9999', shop_code: 'SHOP002', level: 'A' }
    ];

    console.log('⏳ Creating shops...');
    for (const shop of shops) {
        const { error } = await supabase.from('sys_shop').upsert(shop, { onConflict: 'shop_name' });
        if (error) console.error(`❌ Error creating shop ${shop.shop_name}:`, error.message);
        else console.log(`✅ Shop created: ${shop.shop_name}`);
    }

    // 2. Create users
    const users = [
        { username: 'ceshimiziqiu', password: 'baozhulingjiang', role: 'admin', status: 'approved', shop_name: '示例官方旗舰店' },
        { username: 'admin', password: 'baozhulingjiang', role: 'admin', status: 'approved' },
        { username: 'hhh', password: '123', role: 'admin', status: 'approved' },
        { username: 'merchant_test', password: '123', role: 'merchant', status: 'approved', shop_name: '新店测试' }
    ];

    console.log('⏳ Creating users...');
    for (const user of users) {
        const { error } = await supabase.from('sys_user').upsert(user, { onConflict: 'username' });
        if (error) console.error(`❌ Error creating user ${user.username}:`, error.message);
        else console.log(`✅ User created: ${user.username} (${user.role})`);
    }

    console.log('🎉 Seeding complete! Try accessing the system now.');
}

seedInitialUsers().catch(console.error);
