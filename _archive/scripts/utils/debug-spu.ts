
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function debugSpu() {
    console.log('🔍 Debugging SPU Library...');

    // 1. Insert directly via Supabase client
    const dummyStyle = {
        name: `Debug Style ${Date.now()}`,
        category: 'Dress',
        image_url: 'http://placeholder.com/img.jpg',
        max_intents: 10
    };

    console.log('Attemping insert:', dummyStyle);
    const { data: inserted, error: insertError } = await supabase
        .from('b_public_style')
        .insert(dummyStyle)
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert failed:', insertError);
        return;
    }
    console.log('✅ Inserted:', inserted);

    // 2. Fetch via Supabase client (Mimic Server Logic)
    console.log('Fetching list via DB client...');
    const { data: list, error: fetchError } = await supabase
        .from('b_public_style')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (fetchError) {
        console.error('❌ Fetch failed:', fetchError);
        return;
    }

    const found = list.find(s => s.id === inserted.id);
    if (found) {
        console.log('✅ Found created style in list.');
    } else {
        console.error('❌ Created style NOT found in list. Top items:', list.map(s => s.name));
    }

    // 3. Test API endpoint
    console.log('Testing API endpoint...');
    try {
        const res = await fetch('http://localhost:3001/api/styles/public?page=1&pageSize=10');
        const json = await res.json();
        console.log('API Status:', res.status);
        console.log('API Data Count:', json.data?.length);
        const foundApi = json.data?.find((s: any) => s.id === inserted.id);
        if (foundApi) {
            console.log('✅ Found created style in API response.');
        } else {
            console.log('❌ Created style NOT found in API response.');
        }
    } catch (e) {
        console.error('API Fetch error:', e);
    }
}

debugSpu();
