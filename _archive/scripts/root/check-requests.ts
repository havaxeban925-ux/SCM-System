
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://oytivxjmmfibudwtjrhe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dGl2eGptbWZpYnVkd3RqcmhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ5Mzg2NSwiZXhwIjoyMDg1MDY5ODY1fQ.8wGKSzquTr4q3ocsVS1s2zZWUiO24kpdsTKXu78jWNI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('Connecting to Supabase...');
    // Check requests
    const { data: records, error } = await supabase
        .from('b_request_record')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Last 10 records:');
    records?.forEach(r => {
        console.log(`[${r.created_at}] ID:${r.id.slice(0, 8)} Type:${r.type} SubType:${r.sub_type} Shop:${r.shop_name} Status:${r.status}`);
    });

    // Check sys_shop for reference
    const { data: shops } = await supabase
        .from('sys_shop')
        .select('shop_name, key_id')
        .limit(10);

    console.log('\nSys Shops (First 10):');
    shops?.forEach(s => console.log(`[${s.key_id}] ${s.shop_name}`));
}

main();
