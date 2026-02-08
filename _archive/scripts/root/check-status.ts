import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://oytivxjmmfibudwtjrhe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dGl2eGptbWZpYnVkd3RqcmhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ5Mzg2NSwiZXhwIjoyMDg1MDY5ODY1fQ.8wGKSzquTr4q3ocsVS1s2zZWUiO24kpdsTKXu78jWNI'
);

async function checkStatus() {
    const { data, error } = await supabase
        .from('b_restock_order')
        .select('id, status')
        .eq('id', '294fc3b4-2ad4-47e4-8346-d95c740e56c7')
        .single();

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Status:', data?.status);
    }
}

checkStatus();
