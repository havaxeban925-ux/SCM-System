import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://oytivxjmmfibudwtjrhe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dGl2eGptbWZpYnVkd3RqcmhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ5Mzg2NSwiZXhwIjoyMDg1MDY5ODY1fQ.8wGKSzquTr4q3ocsVS1s2zZWUiO24kpdsTKXu78jWNI'
);

async function checkAccounts() {
    // 查询商家店铺
    const { data: shops, error } = await supabase
        .from('b_shop')
        .select('id, name, contact_person')
        .limit(10);

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('商家店铺:', JSON.stringify(shops, null, 2));
    }
}

checkAccounts();
