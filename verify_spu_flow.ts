import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Load .env.local first
dotenv.config(); // fallback

import { getSupabase } from './server/lib/supabase';

async function verifySpuFlow() {
    const supabase = getSupabase();
    console.log('Starting SPU flow verification...');

    // 1. Setup: Create a test style demand
    console.log('1. Creating test style demand...');
    const { data: style, error: createError } = await supabase
        .from('b_style_demand')
        .insert({
            name: 'Verification Test Style',
            shop_id: 'd9f9c738-9e8a-4d5b-8f1e-2c3b4a5d6e7f', // Assuming a valid shop_id or null if nullable, but allow me to pick one existing shop to be safe. Actually let's try to query one first.
            status: 'developing',
            development_status: 'ok', // Ready to upload SPU
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (createError) {
        // If shop_id constraint fails, try to fetch a shop first
        console.log('Create failed, trying to fetch a shop...');
        const { data: shop } = await supabase.from('sys_shop').select('id').limit(1).single();
        if (shop) {
            const { data: styleRetried, error: createRetryError } = await supabase
                .from('b_style_demand')
                .insert({
                    name: 'Verification Test Style',
                    shop_id: shop.id,
                    status: 'developing',
                    development_status: 'ok',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            if (createRetryError) throw createRetryError;
            console.log('Test style created:', styleRetried.id);
            await runFlow(styleRetried.id);
        } else {
            throw new Error('No shop found to create style');
        }
    } else {
        console.log('Test style created:', style.id);
        await runFlow(style.id);
    }

    async function runFlow(styleId: string) {
        const API_BASE = 'http://localhost:3001';

        // 2. Merchant Upload SPU
        console.log('\n2. Merchant uploading SPU...');
        // We simulate the API call by using fetch if available (node 18+) or just checking DB update if we can't call API easily from here without auth tokens.
        // Actually, the API doesn't seem to require strict auth for internal calls or we can simulate it. 
        // But wait, the API calls in previous steps didn't have auth headers? 
        // `admin/pages/StyleManage.tsx` uses fetch without auth headers (cookies?).
        // Let's try to update DB directly to simulate "API Logic" if fetch fails, OR just use the code logic.
        // Better: Verify the code logic I wrote by simulating the "End State" of the API.
        // NO, verification means verify the API works.
        // I will try to use `fetch`.

        try {
            const uploadRes = await fetch(`${API_BASE}/api/development/${styleId}/spu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spuList: 'SPU-TEST-001' })
            });
            const uploadJson = await uploadRes.json();
            console.log('Upload response:', uploadJson);
        } catch (e) {
            console.log('API call failed (server might not be running or network issue), skipping API call verification and checking DB directly.');
        }

        // Verify Status is 'spu_verify'
        const { data: styleAfterUpload } = await supabase
            .from('b_style_demand')
            .select('development_status')
            .eq('id', styleId)
            .single();

        console.log(`Status after upload: ${styleAfterUpload?.development_status} (Expected: spu_verify)`);
        if (styleAfterUpload?.development_status !== 'spu_verify') {
            console.error('FAILED: Status did not update to spu_verify');
            // Manually set it for next step if failed
            await supabase.from('b_style_demand').update({ development_status: 'spu_verify', back_spu: 'SPU-TEST-001' }).eq('id', styleId);
        }

        // 3. Buyer Confirm SPU
        console.log('\n3. Buyer confirming SPU...');
        try {
            const confirmRes = await fetch(`${API_BASE}/api/development/${styleId}/spu-confirm`, {
                method: 'POST'
            });
            const confirmJson = await confirmRes.json();
            console.log('Confirm response:', confirmJson);
        } catch (e) {
            console.log('API call failed.');
        }

        // 4. Verify Final State
        const { data: styleFinal } = await supabase
            .from('b_style_demand')
            .select('status, development_status')
            .eq('id', styleId)
            .single();
        console.log(`Final Status: ${styleFinal?.status} (Expected: completed)`);
        console.log(`Final Dev Status: ${styleFinal?.development_status} (Expected: success)`);

        const { data: spuRecord } = await supabase
            .from('sys_spu')
            .select('*')
            .eq('style_demand_id', styleId)
            .single();

        if (spuRecord) {
            console.log('SUCCESS: SPU record found in sys_spu:', spuRecord.spu_code);
        } else {
            console.error('FAILED: SPU record NOT found in sys_spu');
        }

        // Cleanup
        console.log('\nCleaning up test data...');
        await supabase.from('sys_spu').delete().eq('style_demand_id', styleId);
        await supabase.from('b_style_demand').delete().eq('id', styleId);
    }
}

verifySpuFlow();
