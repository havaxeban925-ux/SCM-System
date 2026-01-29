// 商家数据导入脚本 - 修复版
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importShops() {
    // 读取 CSV 文件
    const csv = fs.readFileSync('./商家情况.csv', 'utf-8');
    const lines = csv.split('\n').filter(line => line.trim());

    // 跳过标题行
    const dataLines = lines.slice(1);

    console.log(`准备导入 ${dataLines.length} 条记录...`);

    // 解析数据
    const shops = dataLines.map((line, idx) => {
        const parts = line.split(',');
        if (parts.length < 4) {
            return null;
        }

        let [key_id, level, shop_id, shop_name] = parts.map(p => p.trim());

        // 清理店铺ID - 移除空格和特殊字符
        shop_id = shop_id.replace(/\s+/g, '').replace(/[^0-9a-zA-Z]/g, '');

        // 如果shop_id为空，跳过
        if (!shop_id) {
            return null;
        }

        // 使用 MD5 生成确定性 UUID
        const uuid = generateUUID(shop_id);

        return {
            id: uuid,
            shop_name: shop_name || `店铺${shop_id}`,
            phone: null,
            role: 'FACTORY',
            key_id: key_id,
            level: level as 'S' | 'A' | 'B' | 'C' | 'N',
        };
    }).filter(Boolean);

    console.log(`有效记录: ${shops.length} 条`);

    // 批量插入，每批 50 条
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < shops.length; i += batchSize) {
        const batch = shops.slice(i, i + batchSize);

        const { error } = await supabase
            .from('sys_shop')
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

        if (error) {
            console.error(`批次 ${Math.floor(i / batchSize) + 1} 错误:`, error.message);
            errorCount += batch.length;
        } else {
            successCount += batch.length;
            if (successCount % 200 === 0 || i + batchSize >= shops.length) {
                console.log(`已导入 ${successCount}/${shops.length} 条`);
            }
        }
    }

    console.log(`\n✅ 导入完成！成功: ${successCount}, 失败: ${errorCount}`);
}

// 使用 MD5 生成确定性 UUID v4 格式
function generateUUID(input: string): string {
    const hash = crypto.createHash('md5').update(input).digest('hex');
    // 格式化为 UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

importShops().catch(console.error);
