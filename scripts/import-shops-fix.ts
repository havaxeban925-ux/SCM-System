// 商家数据导入脚本 - 修复乱码版
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';
// @ts-ignore
import iconv from 'iconv-lite';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importShops() {
    console.log('开始读取 CSV...');

    // 读取原始 buffer
    const buffer = fs.readFileSync('./商家情况.csv');

    // 强制使用 GBK 解码
    const csv = iconv.decode(buffer, 'gbk');
    console.log('使用 GBK 解码读取文件');

    const lines = csv.split(/[\r\n]+/).filter(line => line.trim());

    // 跳过标题行
    const dataLines = lines.slice(1);

    console.log(`准备导入 ${dataLines.length} 条记录...`);
    // 打印第一条看看是否正常
    if (dataLines.length > 0) {
        console.log('第一条数据预览:', dataLines[0]);
    }

    // 解析数据
    const shops = dataLines.map((line, idx) => {
        const parts = line.split(',');
        if (parts.length < 4) {
            return null;
        }

        let [key_id, level, shop_id, shop_name] = parts.map(p => p.trim());

        // 清理店铺ID
        shop_id = shop_id.replace(/\s+/g, '').replace(/[^0-9a-zA-Z]/g, '');

        if (!shop_id) return null;

        const uuid = generateUUID(shop_id);

        return {
            id: uuid,
            shop_name: shop_name || `店铺${shop_id}`,
            phone: null, // Excel 中没有电话
            role: 'FACTORY',
            key_id: key_id,
            shop_code: shop_id, // 存储原始店铺ID
            level: (level && ['S', 'A', 'B', 'C', 'N'].includes(level)) ? level : 'N',
        };
    }).filter(Boolean);

    console.log(`有效记录: ${shops.length} 条`);

    // 批量插入
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < shops.length; i += batchSize) {
        const batch = shops.slice(i, i + batchSize);

        // 先删除旧数据（可选，为了彻底修复乱码，我们直接 upsert，但如果 ID 本身是基于 ID 生成的，upsert 会覆盖）
        // 注意：shop_id 是基于 ID 生成 UUID 的，所以只要 ID 没变，upsert 就会更新字段
        const { error } = await supabase
            .from('sys_shop')
            .upsert(batch, { onConflict: 'id' });

        if (error) {
            console.error(`批次错误:`, error.message);
        } else {
            successCount += batch.length;
            process.stdout.write(`\r已处理 ${successCount}/${shops.length}`);
        }
    }

    console.log(`\n✅ 修复完成！`);
}

function generateUUID(input: string): string {
    const hash = crypto.createHash('md5').update(input).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

importShops().catch(console.error);
