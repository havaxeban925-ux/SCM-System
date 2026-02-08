
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oytivxjmmfibudwtjrhe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dGl2eGptbWZpYnVkd3RqcmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTM4NjUsImV4cCI6MjA4NTA2OTg2NX0.72XjkULEJ6v0Ptl_2A7-sIl1usK-Rj1PTVXeT2eKJe0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShop() {
    const shopId = '5efe3196-77ce-470c-9662-169440d3a484';
    console.log(`Querying shop with ID: ${shopId}`);

    const { data: shop, error } = await supabase
        .from('sys_shop')
        .select('*')
        .eq('id', shopId)
        .single();

    if (error) {
        console.error('Error fetching shop:', error);
    } else {
        console.log('Shop Details:');
        console.log(`ID: ${shop.id}`);
        console.log(`Name: ${shop.shop_name}`);
        console.log(`KEY: ${shop.key_id}`);
        console.log(`Code: ${shop.shop_code}`);
    }
}

checkShop();
