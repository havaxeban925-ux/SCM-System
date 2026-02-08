
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const merchants = [
    { phone: '12345678901', name: '春秋女装旗舰店', code: 'SHOP_A' },
    { phone: '12345678902', name: '夏日时尚馆', code: 'SHOP_B' },
    { phone: '12345678903', name: '冬季保暖专营', code: 'SHOP_C' },
    { phone: '12345678904', name: '四季潮流店', code: 'SHOP_D' }
];

async function prepareAccounts() {
    console.log('Starting account preparation...');

    for (const m of merchants) {
        console.log(`Processing ${m.name} (${m.phone})...`);

        // 1. Prepare sys_user
        let { data: user } = await supabase
            .from('sys_user')
            .select('id, status')
            .eq('username', m.phone)
            .single();

        if (!user) {
            console.log(`Creating sys_user for ${m.phone}...`);
            const { data: newUser, error } = await supabase
                .from('sys_user')
                .insert({
                    username: m.phone,
                    password: '123456', // Plain text as per auth.ts logic
                    role: 'merchant',
                    shop_name: m.name,
                    status: 'approved',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error(`Failed to create sys_user: ${error.message}`);
                continue;
            }
            user = newUser;
        } else if (user.status !== 'approved') {
            console.log(`Updating sys_user status for ${m.phone}...`);
            await supabase
                .from('sys_user')
                .update({ status: 'approved' })
                .eq('id', user.id);
        }

        // 2. Prepare sys_shop
        const { data: sysShop } = await supabase
            .from('sys_shop')
            .select('id')
            .eq('shop_name', m.name)
            .single();

        if (!sysShop) {
            console.log(`Creating sys_shop for ${m.name}...`);
            await supabase
                .from('sys_shop')
                .insert({
                    shop_name: m.name,
                    role: 'FACTORY',
                    key_id: m.code,
                    shop_code: m.code,
                    level: 'A',
                    phone: m.phone
                });
        }

        // 3. Prepare b_shop (Business table)
        // Check if b_shop table exists first by trying to select
        const { error: checkError } = await supabase.from('b_shop').select('id').limit(1);
        if (!checkError) {
            const { data: bShop } = await supabase
                .from('b_shop')
                .select('id')
                .eq('name', m.name)
                .single();

            if (!bShop) {
                console.log(`Creating b_shop for ${m.name}...`);
                await supabase
                    .from('b_shop')
                    .insert({
                        name: m.name,
                        contact_person: '测试店长',
                        contact_phone: m.phone
                    });
            }
        } else {
            console.log('Table b_shop might not exist or verify failed, skipping b_shop insertion.');
        }

        console.log(`Done processing ${m.name}`);
    }

    console.log('All accounts prepared.');
}

prepareAccounts().catch(console.error);
