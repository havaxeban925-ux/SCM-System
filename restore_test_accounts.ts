import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ 缺少 Supabase 配置，请检查 .env.local 文件');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const TEST_DATA = {
    shops: [
        {
            id: "2ce9c413-5a16-4e0b-af40-525da031413f",
            shop_name: "春秋女装旗舰店",
            phone: "12345678901",
            role: "FACTORY",
            created_at: "2026-02-09T03:26:29.887112+00:00",
            updated_at: "2026-02-09T03:26:29.887112+00:00",
            key_id: "KEY1",
            level: "A",
            shop_code: "SHOP_A"
        },
        {
            id: "9e21b0f3-a58f-4bd3-9f37-e717c3640e9a",
            shop_name: "夏日时尚馆",
            phone: "12345678902",
            role: "FACTORY",
            created_at: "2026-02-09T03:26:34.603623+00:00",
            updated_at: "2026-02-09T03:26:34.603623+00:00",
            key_id: "KEY2",
            level: "A",
            shop_code: "SHOP_B"
        },
        {
            id: "c1942599-85cf-4881-9e4f-cb994f301caa",
            shop_name: "冬季保暖专营",
            phone: "12345678903",
            role: "FACTORY",
            created_at: "2026-02-09T03:26:36.823361+00:00",
            updated_at: "2026-02-09T03:26:36.823361+00:00",
            key_id: "KEY3",
            level: "A",
            shop_code: "SHOP_C"
        },
        {
            id: "382ee552-d2ee-408f-9911-3610381e189d",
            shop_name: "四季潮流店",
            phone: "12345678904",
            role: "FACTORY",
            created_at: "2026-02-09T03:26:39.162098+00:00",
            updated_at: "2026-02-09T03:26:39.162098+00:00",
            key_id: "KEY4",
            level: "A",
            shop_code: "SHOP_D"
        }
    ],
    users: [
        {
            id: "0555ac0e-dc54-4a19-8424-29d9e10a661a",
            username: "秋测试",
            password: "123456",
            role: "buyer",
            shop_name: null,
            status: "approved",
            reject_reason: null,
            created_at: "2026-02-09T07:58:41.425+00:00",
            updated_at: "2026-02-09T07:58:41.427+00:00"
        },
        {
            id: "9665b51d-a137-4eb0-b3e4-cea4e7921450",
            username: "ceshimiziqiu",
            password: "baozhulingjiang",
            role: "admin",
            shop_name: "示例官方旗舰店",
            status: "approved",
            reject_reason: null,
            created_at: "2026-02-02T07:11:31.950348+00:00",
            updated_at: "2026-02-02T07:11:31.950348+00:00"
        },
        {
            id: "aa284b9c-0db6-409d-9fee-0840d18e8c88",
            username: "admin",
            password: "baozhulingjiang",
            role: "admin",
            shop_name: null,
            status: "approved",
            reject_reason: null,
            created_at: "2026-02-02T07:11:33.310638+00:00",
            updated_at: "2026-02-02T07:11:33.310638+00:00"
        },
        {
            id: "110268cd-e423-47c0-8461-8c7fb7f2b922",
            username: "hhh",
            password: "123",
            role: "admin",
            shop_name: null,
            status: "approved",
            reject_reason: null,
            created_at: "2026-02-02T07:11:33.797759+00:00",
            updated_at: "2026-02-02T07:11:33.797759+00:00"
        }
    ]
};

async function restoreTestAccounts() {
    console.log('🚀 开始恢复测试账号...\n');

    // 恢复店铺数据
    console.log('📦 恢复店铺数据...');
    for (const shop of TEST_DATA.shops) {
        const { data: existing } = await supabase
            .from('sys_shop')
            .select('id')
            .eq('id', shop.id)
            .single();

        if (existing) {
            console.log(`  ✓ 店铺 "${shop.shop_name}" 已存在，跳过`);
        } else {
            const { error } = await supabase
                .from('sys_shop')
                .insert(shop);

            if (error) {
                console.error(`  ✗ 店铺 "${shop.shop_name}" 恢复失败:`, error.message);
            } else {
                console.log(`  ✓ 店铺 "${shop.shop_name}" 恢复成功`);
            }
        }
    }

    // 恢复用户数据
    console.log('\n👤 恢复用户数据...');
    for (const user of TEST_DATA.users) {
        const { data: existing } = await supabase
            .from('sys_user')
            .select('id')
            .eq('id', user.id)
            .single();

        if (existing) {
            console.log(`  ✓ 用户 "${user.username}" 已存在，跳过`);
        } else {
            const { error } = await supabase
                .from('sys_user')
                .insert(user);

            if (error) {
                console.error(`  ✗ 用户 "${user.username}" 恢复失败:`, error.message);
            } else {
                console.log(`  ✓ 用户 "${user.username}" 恢复成功`);
            }
        }
    }

    console.log('\n✅ 测试账号恢复完成！\n');

    // 显示恢复后的账号列表
    console.log('📋 恢复后的测试账号列表：');
    console.log('\n--- 店铺 ---');
    const { data: shops } = await supabase.from('sys_shop').select('shop_name, key_id, level');
    console.table(shops);

    console.log('--- 用户 ---');
    const { data: users } = await supabase.from('sys_user').select('username, role, status');
    console.table(users);
}

restoreTestAccounts().catch(console.error);
