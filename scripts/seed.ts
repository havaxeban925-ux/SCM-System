/**
 * 种子数据脚本 - 生成测试数据到 Supabase
 * 运行方式: npx tsx scripts/seed.ts
 */

import { faker } from '@faker-js/faker/locale/zh_CN';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ 缺少 Supabase 配置，请检查 .env.local 文件');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 女装店铺名称前缀
const shopPrefixes = ['时尚', '优雅', '潮流', '美丽', '甜美', '复古', '简约', '高端', '轻奢', '精品'];
const shopSuffixes = ['女装馆', '服饰店', '衣橱', '时装屋', '精品店'];

// 款式标签
const styleTags = ['碎花', '纯色', '条纹', '格子', '刺绣', '蕾丝', '针织', '雪纺', '丝绒', '丹宁'];

// 女装类型
const clothingTypes = ['连衣裙', '半身裙', 'T恤', '衬衫', '针织衫', '外套', '大衣', '毛衣', '背心', '裤子'];

// 颜色
const colors = ['米白', '黑色', '藏蓝', '酒红', '杏色', '浅粉', '墨绿', '驼色', '灰色', '卡其'];

/**
 * 生成随机店铺数据
 */
function generateShops(count: number) {
    return Array.from({ length: count }, () => ({
        shop_name: `${faker.helpers.arrayElement(shopPrefixes)}${faker.helpers.arrayElement(shopSuffixes)}`,
        phone: faker.phone.number(),
        role: 'FACTORY' as const,
    }));
}

/**
 * 生成公款款式数据
 */
function generatePublicStyles(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        name: `${faker.helpers.arrayElement(colors)}${faker.helpers.arrayElement(clothingTypes)}`,
        image_url: `https://picsum.photos/seed/style${i + 1}/400/500`,
        intent_count: faker.number.int({ min: 0, max: 2 }),
        max_intents: 2,
        tags: faker.helpers.arrayElements(styleTags, { min: 1, max: 3 }),
    }));
}

/**
 * 生成款式需求数据
 */
function generateStyleDemands(count: number, shopIds: string[]) {
    const statuses = ['locked', 'new', 'developing', 'completed'] as const;
    const devStatuses = ['drafting', 'helping', 'ok', 'success'] as const;

    return Array.from({ length: count }, (_, i) => {
        const shopId = faker.helpers.arrayElement(shopIds);
        const status = faker.helpers.arrayElement(statuses);

        return {
            push_type: faker.helpers.arrayElement(['ASSIGN', 'POOL']),
            shop_id: shopId,
            shop_name: faker.company.name() + '店',
            image_url: `https://picsum.photos/seed/demand${i + 1}/400/500`,
            ref_link: faker.internet.url(),
            name: `${faker.helpers.arrayElement(colors)}${faker.helpers.arrayElement(clothingTypes)} - ${faker.commerce.productAdjective()}款`,
            remark: faker.lorem.sentence(),
            timestamp_label: faker.helpers.arrayElement(['2小时前转入', '昨天 15:30 推送', '3天前', '本周一推送']),
            status,
            days_left: status === 'locked' ? faker.number.int({ min: 1, max: 7 }) : null,
            development_status: status === 'developing' ? faker.helpers.arrayElement(devStatuses) : null,
            is_modify_img: faker.datatype.boolean(),
        };
    });
}

/**
 * 生成补货单数据
 */
function generateRestockOrders(count: number, shopIds: string[], demandNames: string[]) {
    const statuses = ['待商家接单', '待买手复核', '生产中', '待买手确认入仓', '已确认入仓'] as const;

    return Array.from({ length: count }, (_, i) => {
        const planQty = faker.number.int({ min: 100, max: 2000 });
        const actualQty = faker.number.int({ min: Math.floor(planQty * 0.8), max: planQty });

        return {
            restock_no: `RS${Date.now()}${String(i + 1).padStart(3, '0')}`,
            skc_code: `SKC${faker.string.alphanumeric(8).toUpperCase()}`,
            name: demandNames[i % demandNames.length] || `款式${i + 1}`,
            image_url: `https://picsum.photos/seed/restock${i + 1}/200`,
            shop_id: faker.helpers.arrayElement(shopIds),
            plan_quantity: planQty,
            actual_quantity: actualQty,
            arrived_quantity: faker.number.int({ min: 0, max: actualQty }),
            status: faker.helpers.arrayElement(statuses),
            remark: faker.lorem.sentence(),
            expiry_date: faker.date.future().toISOString().split('T')[0],
        };
    });
}

async function seed() {
    console.log('🌱 开始生成种子数据...\n');

    try {
        // 1. 生成并插入店铺数据
        console.log('📦 生成店铺数据...');
        const shops = generateShops(5);
        const { data: insertedShops, error: shopError } = await supabase
            .from('sys_shop')
            .insert(shops)
            .select();

        if (shopError) {
            console.error('❌ 插入店铺失败:', shopError.message);
            return;
        }
        console.log(`✅ 成功插入 ${insertedShops?.length ?? 0} 个店铺`);

        const shopIds = insertedShops?.map((s) => s.id) ?? [];

        // 2. 生成并插入公款款式数据
        console.log('\n📦 生成公款款式数据...');
        const publicStyles = generatePublicStyles(10);
        const { data: insertedStyles, error: styleError } = await supabase
            .from('b_public_style')
            .insert(publicStyles)
            .select();

        if (styleError) {
            console.error('❌ 插入公款款式失败:', styleError.message);
            return;
        }
        console.log(`✅ 成功插入 ${insertedStyles?.length ?? 0} 条公款款式`);

        // 3. 生成并插入款式需求数据
        console.log('\n📦 生成款式需求数据...');
        const styleDemands = generateStyleDemands(20, shopIds);
        const { data: insertedDemands, error: demandError } = await supabase
            .from('b_style_demand')
            .insert(styleDemands)
            .select();

        if (demandError) {
            console.error('❌ 插入款式需求失败:', demandError.message);
            return;
        }
        console.log(`✅ 成功插入 ${insertedDemands?.length ?? 0} 条款式需求`);

        const demandNames = insertedDemands?.map((d) => d.name) ?? [];

        // 4. 生成并插入补货单数据
        console.log('\n📦 生成补货单数据...');
        const restockOrders = generateRestockOrders(5, shopIds, demandNames);
        const { data: insertedRestocks, error: restockError } = await supabase
            .from('b_restock_order')
            .insert(restockOrders)
            .select();

        if (restockError) {
            console.error('❌ 插入补货单失败:', restockError.message);
            return;
        }
        console.log(`✅ 成功插入 ${insertedRestocks?.length ?? 0} 条补货单`);

        console.log('\n🎉 种子数据生成完成！');
        console.log('=====================================');
        console.log(`店铺: ${insertedShops?.length ?? 0} 条`);
        console.log(`公款款式: ${insertedStyles?.length ?? 0} 条`);
        console.log(`款式需求: ${insertedDemands?.length ?? 0} 条`);
        console.log(`补货单: ${insertedRestocks?.length ?? 0} 条`);

    } catch (error) {
        console.error('❌ 发生错误:', error);
    }
}

seed();
