
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 解决 ES Module 中 __dirname 问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    console.log('🌱 开始预置演示数据...');

    try {
        // 1. 清理数据
        console.log('🧹 清理旧数据...');
        await supabase.from('b_tag').delete().neq('id', 0);
        await supabase.from('sys_shop').delete().like('shop_name', '%演示%');
        await supabase.from('b_style_demand').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('b_request_record').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('b_restock_order').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 2. 预置 Tags
        console.log('🏷️ 创建标签...');
        const tags = [
            { name: '复古', category: 'visual', sort_order: 1 },
            { name: '极简', category: 'visual', sort_order: 2 },
            { name: '多巴胺', category: 'visual', sort_order: 3 },
            { name: '连衣裙', category: 'style', sort_order: 1 },
            { name: '衬衫', category: 'style', sort_order: 2 },
            { name: '半身裙', category: 'style', sort_order: 3 },
        ];
        await supabase.from('b_tag').insert(tags);

        // 3. 预置商铺 (不同等级)
        console.log('🏪 创建演示商铺...');
        const shops = [
            { shop_name: '演示店铺A (S级)', level: 'S', key_id: 'KEY_DEMO_A' },
            { shop_name: '演示店铺B (A级)', level: 'A', key_id: 'KEY_DEMO_B' },
            { shop_name: '演示店铺C (B级)', level: 'B', key_id: 'KEY_DEMO_C' },
        ];
        const { data: createdShops } = await supabase.from('sys_shop').insert(shops).select();

        // 4. 预置一些历史工单以填充 Dashboard
        console.log('📊 创建历史记录...');
        if (createdShops && createdShops.length > 0) {
            const shopA = createdShops[0];

            // 已完成的款式
            await supabase.from('b_style_demand').insert({
                shop_id: shopA.id,
                shop_name: shopA.shop_name,
                status: 'completed',
                development_status: 'success',
                name: '演示已完成款式',
                back_spu: 'SPU001 SPU002',
                created_at: new Date(Date.now() - 86400000 * 5).toISOString() // 5 days ago
            });

            // 开发中的款式
            await supabase.from('b_style_demand').insert({
                shop_id: shopA.id,
                shop_name: shopA.shop_name,
                status: 'developing',
                development_status: 'drafting',
                name: '演示开发中款式',
                created_at: new Date().toISOString()
            });

            // 待处理的核价
            await supabase.from('b_request_record').insert({
                type: 'pricing',
                sub_type: '报价单 (毛织)',
                status: 'processing',
                shop_name: shopA.shop_name,
                target_codes: ['SKC-DEMO-01'],
                created_at: new Date().toISOString()
            });
        }

        console.log('✅ 演示数据预置完成!');
        console.log('   - Tags: 6 个');
        console.log('   - Shops: 3 个');
        console.log('   - Dashboard 数据已填充');

    } catch (err: any) {
        console.error('❌ 预置失败:', err.message);
    }
}

seed();
