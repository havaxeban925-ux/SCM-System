
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    console.log('🚀 开始修复数据...');

    // 1. 修正用户关联的店铺名
    console.log('1. 更新用户 ceshimiziqiu 的 shop_name -> 米子秋');
    const { error: userError } = await supabase
        .from('sys_user')
        .update({ shop_name: '米子秋' })
        .eq('username', 'ceshimiziqiu');

    if (userError) console.error('❌ User Update Error:', userError.message);
    else console.log('✅ 用户更新成功');

    // 2. 修正商铺的名称和 key_id
    console.log('2. 通过 ID 更新商铺 -> 米子秋, 并确认 key_id 为 米子秋新号');
    const targetShopId = '180719e3-a575-4e73-9e6d-ac29d48e9213';

    const { error: shopError } = await supabase
        .from('sys_shop')
        .update({
            shop_name: '米子秋',
            key_id: '米子秋新号'
        })
        .eq('id', targetShopId);

    if (shopError) console.error(`❌ Shop Update Error:`, shopError.message);
    else console.log(`✅ 商铺已成功修正为 米子秋 (KEY: 米子秋新号)`);

    console.log('--- 修复完成 ---');
}

fixData().catch(console.error);
