
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- 诊断开始 ---');

    // 1. 查找商铺
    console.log('\n[1. 查找包含 "米子秋" 的商铺]');
    const { data: shops, error: shopError } = await supabase
        .from('sys_shop')
        .select('*')
        .or('shop_name.ilike.%米子秋%,key_id.ilike.%米子秋%');

    if (shopError) console.error('Shop Error:', shopError);
    else console.table(shops);

    // 2. 查找最近的私推记录
    console.log('\n[2. 查找最近 10 条私推记录]');
    const { data: demands, error: demandError } = await supabase
        .from('b_style_demand')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (demandError) console.error('Demand Error:', demandError);
    else console.table(demands?.map(d => ({
        id: d.id,
        name: d.name,
        shop_id: d.shop_id,
        shop_name: d.shop_name,
        status: d.status,
        push_type: d.push_type,
        created_at: d.created_at
    })));

    // 3. 查找特定的 sys_user
    console.log('\n[3. 查找账号 "ceshimiziqiu"]');
    const { data: users, error: userError } = await supabase
        .from('sys_user')
        .select('*')
        .eq('username', 'ceshimiziqiu');

    if (userError) console.error('User Error:', userError);
    else console.table(users);
}

diagnose().catch(console.error);
