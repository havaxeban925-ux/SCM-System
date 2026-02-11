
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreUsers() {
    console.log('Restoring test users...');

    // 1. Restore Merchant
    const merchantUser = {
        username: 'merchant',
        password: '123456', // In production use hash, here plain for test
        role: 'merchant',
        shop_name: '测试店铺',
        status: 'approved',
        created_at: new Date().toISOString()
    };

    console.log('Checking merchant user...');
    const { data: existingMerchant, error: merchantCheckError } = await supabase.from('sys_user').select('id').eq('username', 'merchant').single();

    if (merchantCheckError && merchantCheckError.code !== 'PGRST116') {
        console.error('Error checking merchant:', merchantCheckError);
    }

    if (!existingMerchant) {
        console.log('Creating merchant...');
        const { error } = await supabase.from('sys_user').insert(merchantUser);
        if (error) console.error('Error creating merchant:', error);
        else console.log('Merchant created');
    } else {
        console.log('Merchant already exists');
    }

    // 2. Restore Shop for Merchant
    const testShop = {
        shop_name: '测试店铺',
        role: 'FACTORY',
        key_id: 'KEY-TEST',
        shop_code: 'TEST001',
        phone: 'merchant',
        level: 'S'
    };

    console.log('Checking test shop...');
    const { data: existingShop, error: shopCheckError } = await supabase.from('sys_shop').select('id').eq('shop_name', '测试店铺').single();

    if (shopCheckError && shopCheckError.code !== 'PGRST116') {
        console.error('Error checking shop:', shopCheckError);
    }

    if (!existingShop) {
        console.log('Creating test shop...');
        const { error } = await supabase.from('sys_shop').insert(testShop);
        if (error) console.error('Error creating shop:', error);
        else console.log('Test Shop created');
    } else {
        console.log('Test Shop already exists');
    }

    // 3. Restore Admin
    const adminUser = {
        username: 'admin',
        password: '123456',
        role: 'admin',
        status: 'approved',
        created_at: new Date().toISOString()
    };

    console.log('Checking admin user...');
    const { data: existingAdmin, error: adminCheckError } = await supabase.from('sys_user').select('id').eq('username', 'admin').single();

    if (adminCheckError && adminCheckError.code !== 'PGRST116') {
        console.error('Error checking admin:', adminCheckError);
    }

    if (!existingAdmin) {
        console.log('Creating admin...');
        const { error } = await supabase.from('sys_user').insert(adminUser);
        if (error) console.error('Error creating admin:', error);
        else console.log('Admin created');
    } else {
        console.log('Admin already exists');
    }

    // 4. Restore Specific Merchant "12345678901"
    const specificMerchant = {
        username: '12345678901',
        password: '123456',
        role: 'merchant',
        shop_name: '测试店铺',
        status: 'approved',
        created_at: new Date().toISOString()
    };

    console.log('Checking specific merchant 12345678901...');
    const { data: existingSpecMerchant } = await supabase.from('sys_user').select('id').eq('username', '12345678901').single();
    if (!existingSpecMerchant) {
        const { error } = await supabase.from('sys_user').insert(specificMerchant);
        if (error) console.error('Error creating specific merchant:', error);
        else console.log('Specific Merchant 12345678901 created');
    } else {
        console.log('Specific Merchant 12345678901 already exists');
    }

    // 5. Restore Specific Buyer "秋测试"
    const specificBuyer = {
        username: '秋测试',
        password: '123456',
        role: 'admin',
        status: 'approved',
        created_at: new Date().toISOString()
    };

    console.log('Checking specific buyer 秋测试...');
    const { data: existingSpecBuyer } = await supabase.from('sys_user').select('id').eq('username', '秋测试').single();
    if (!existingSpecBuyer) {
        const { error } = await supabase.from('sys_user').insert(specificBuyer);
        if (error) console.error('Error creating specific buyer:', error);
        else console.log('Specific Buyer 秋测试 created');
    } else {
        console.log('Specific Buyer 秋测试 already exists');
    }
}

restoreUsers();
