
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPrivatePush() {
    console.log('🧪 Testing Private Push (b_style_demand insertion)...');

    // Mimic the backend logic in admin.ts
    // Intentionally OMITTING 'tags' to verify if it works without it.
    const testPayload = {
        push_type: 'PRIVATE',
        shop_id: null, // Can be null for testing or mock a UUID if needed, schema allows null? Let's check schema.
        // Schema says: shop_id UUID REFERENCES sys_shop(id)
        // If RLS allows anonymous, and we are using service role, we should be fine, but we might need a valid shop_id if constraints enforce it.
        // Let's first try with a dummy shop name and valid null shop_id if allowed.
        // Getting a valid shop ID first just in case.

        shop_name: 'Test Shop Private Push',
        image_url: 'http://placeholder.com/test.jpg',
        name: 'Test Style Private Push',
        remark: 'Testing constraint',
        days_left: 3,
        status: 'new',
        timestamp_label: '刚刚',
        tags: ['人模', '优雅风'],
        created_at: new Date().toISOString()
    };

    // We need a shop ID if we want to be realistic, but let's try to find one first
    const { data: shops } = await supabase.from('sys_shop').select('id').limit(1);
    if (shops && shops.length > 0) {
        // @ts-ignore
        testPayload.shop_id = shops[0].id;
        console.log(`Using existing shop ID: ${shops[0].id}`);
    } else {
        console.log('No shops found, attempting with null shop_id (might fail if foreign key prevents it)');
    }

    // Insert
    const { data, error } = await supabase
        .from('b_style_demand')
        .insert(testPayload)
        .select();

    if (error) {
        console.error('❌ Failed to insert:', error.message);
        console.error('Full Error:', error);
    } else {
        console.log('✅ Success! Inserted record:', data);
    }
}

testPrivatePush().catch(console.error);
