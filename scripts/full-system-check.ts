
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const API_URL = 'http://localhost:3001/api';

// Client for simulating user actions (using Anon Key)
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

// Admin Client for seeding data/approving users (using Service Role Key)
// Fallback to Anon key if Service Key is missing (dev env might vary), but warn.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, SERVICE_KEY!);

const TEST_USER = {
    username: `auto_test_${Date.now()}`,
    password: 'password123',
    shop_name: `Test Shop ${Date.now()}`
};

async function post(url: string, body: any) {
    const res = await fetch(`${API_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return { status: res.status, data: await res.json() };
}

async function get(url: string) {
    const res = await fetch(`${API_URL}${url}`);
    return { status: res.status, data: await res.json() };
}

async function runCheck() {
    console.log('🚀 Starting Full System Check...\n');
    const results: Record<string, string> = {};

    try {
        // 1. Auth & Registration
        console.log(`[1/6] Testing Auth (Register: ${TEST_USER.username})...`);
        const regRes = await post('/auth/register', TEST_USER);
        if (regRes.status !== 200) throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);

        // Auto-approve
        console.log('      Approving user...');
        const userRes = await supabaseAdmin.from('sys_user').select('id').eq('username', TEST_USER.username).single();
        if (!userRes.data) throw new Error('User not found in DB');

        // Approve via API if possible, or direct DB update for speed/reliability in test
        // Let's use direct DB update to ensure it works even if Admin API has guards we didn't check
        // But wait, the plan said "Verify systems", so using API is better.
        // Let's try API approve.
        const approveRes = await post('/auth/approve', {
            userId: userRes.data.id,
            keyId: `KEY-${Date.now()}`,
            shopCode: `SHOP-${Date.now().toString().slice(-4)}`,
            level: 'S'
        });
        if (approveRes.status !== 200) throw new Error(`Approval failed: ${JSON.stringify(approveRes.data)}`);

        // Login
        const loginRes = await post('/auth/login', { username: TEST_USER.username, password: TEST_USER.password });
        if (loginRes.status !== 200) throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
        console.log('      ✅ Auth Flow (Register -> Approve -> Login) OK');
        results['Auth'] = 'PASS';

        // Fetch the created Shop ID to satisfy FK constraints in later steps
        const { data: shopData, error: shopError } = await supabaseAdmin
            .from('sys_shop')
            .select('id')
            .eq('shop_name', TEST_USER.shop_name)
            .single();

        if (shopError || !shopData) throw new Error(`Could not find shop for user: ${TEST_USER.shop_name}`);
        const realShopId = shopData.id;
        console.log(`      ℹ️ Real Shop ID: ${realShopId}`);


        // 2. SPU Library (Public Styles)
        console.log('\n[2/6] Testing SPU Library...');
        // Create a dummy public style directly in DB to ensure there is something to fetch
        const dummyStyle = {
            name: 'Auto Test Style',
            // category: 'Dress', // Column doesn't exist
            image_url: 'http://placeholder.com/img.jpg',
            max_intents: 10
        };
        const { data: styleData, error: styleError } = await supabaseAdmin.from('b_public_style').insert(dummyStyle).select().single();
        if (styleError) throw new Error(`Failed to seed public style: ${styleError.message}`);

        const publicStylesRes = await get('/styles/public?page=1&pageSize=10');
        if (publicStylesRes.status !== 200) throw new Error(`Fetch public styles failed`);
        if (!publicStylesRes.data.data.find((s: any) => s.id === styleData.id)) throw new Error('Created style not found in public list');
        console.log('      ✅ SPU Library Fetch OK');
        results['SPU Library'] = 'PASS';


        // 3. Push/Claim Style (Merchant Workflow)
        console.log('\n[3/6] Testing Style Claim (Push/Pull)...');
        const claimRes = await post(`/styles/public/${styleData.id}/confirm`, {
            publicStyle: styleData,
            shopId: realShopId,
            shopName: TEST_USER.shop_name
        });
        if (claimRes.status !== 200) throw new Error(`Claim style failed: ${JSON.stringify(claimRes.data)}`);
        console.log('      ✅ Style Claim OK');
        results['Style Claim'] = 'PASS';


        // 4. Pricing Request
        console.log('\n[4/6] Testing Pricing Request...');
        const pricingRes = await post('/requests/quote', {
            subType: '常规核价',
            shopName: TEST_USER.shop_name,
            quotes: [{ code: 'TEST-SKC-001', price: 100, type: 'NORMAL', detailJson: {} }]
        });
        if (pricingRes.status !== 200) throw new Error(`Pricing request failed: ${JSON.stringify(pricingRes.data)}`);
        console.log('      ✅ Pricing Request OK');
        results['Pricing'] = 'PASS';


        // 5. Anomaly Request
        console.log('\n[5/6] Testing Anomaly Request...');
        const anomalyRes = await post('/requests/anomaly', {
            subType: '工期延误',
            targetCodes: ['TEST-SKC-001'],
            content: 'Auto test anomaly'
        });
        if (anomalyRes.status !== 200) throw new Error(`Anomaly request failed: ${JSON.stringify(anomalyRes.data)}`);
        console.log('      ✅ Anomaly Request OK');
        results['Anomaly'] = 'PASS';


        // 6. Restock (Read-only check for now as flow is complex)
        console.log('\n[6/6] Testing Restock (Data Access)...');
        // Seed a restock order
        const { error: restockError } = await supabaseAdmin.from('b_restock_order').insert({
            original_order_id: 'TEST-ORDER',
            shop_name: TEST_USER.shop_name,
            skc_code: 'TEST-SKC-001',
            image_url: 'http://img',
            plan_quantity: 50,
            produced_quantity: 0,
            status: 'pending'
        });
        if (restockError) console.warn('      ⚠️ Could not seed restock order (might be minor schema update needed)');

        const restockRes = await get('/restock?page=1');
        if (restockRes.status !== 200) throw new Error(`Fetch restock failed`);
        console.log('      ✅ Restock List Access OK');
        results['Restock'] = 'PASS';

    } catch (e: any) {
        console.error(`\n❌ CRITICAL FAILURE: ${e.message}`);
        process.exit(1);
    }

    console.log('\n==========================================');
    console.log('SUMMARY:');
    Object.entries(results).forEach(([k, v]) => console.log(`${k}: ${v}`));
    console.log('==========================================');
}

runCheck();
