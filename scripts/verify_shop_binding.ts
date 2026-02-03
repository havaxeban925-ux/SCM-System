
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function verifyBinding() {
    console.log('🧪 Verifying Shop Binding logic...');

    const testUsername = 'test_binder_' + Date.now();
    const testShopName = 'Test Binding Shop ' + Date.now();

    // 1. Create a pending user
    console.log(`1. Creating pending user: ${testUsername}`);
    const { error: userError } = await supabase.from('sys_user').insert({
        username: testUsername,
        password: '123',
        role: 'merchant',
        status: 'pending'
    });
    if (userError) throw userError;

    // 2. Call the API to create shop and bind (Simulate Admin Action)
    console.log(`2. Calling API to create shop and bind to ${testUsername}`);
    const baseUrl = 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/admin/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            shopName: testShopName,
            keyId: 'K-BIND',
            level: 'B',
            phone: '13800000000',
            bindingAccount: testUsername
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API failed: ${errText}`);
    }

    const result = await response.json();
    console.log('API Response:', result);

    // 3. Verify in DB
    console.log('3. Verifying database state...');
    const { data: updatedUser, error: fetchError } = await supabase
        .from('sys_user')
        .select('*')
        .eq('username', testUsername)
        .single();

    if (fetchError) throw fetchError;

    if (updatedUser.status === 'approved' && updatedUser.shop_name === testShopName) {
        console.log('✅ Success! User status is approved and shop_name is linked.');
    } else {
        console.error('❌ Failure status:', updatedUser.status, 'shop_name:', updatedUser.shop_name);
    }

    // Cleanup
    await supabase.from('sys_user').delete().eq('username', testUsername);
    await supabase.from('sys_shop').delete().eq('shop_name', testShopName);
}

verifyBinding().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
