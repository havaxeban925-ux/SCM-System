// 检查失败的商家数据
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFailedRecords() {
    const csv = fs.readFileSync('./商家情况.csv', 'utf-8');
    const lines = csv.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1);

    const failedRecords: string[] = [];
    failedRecords.push('行号,KEY,KEY标签,店铺ID,店铺名称,失败原因');

    for (let idx = 0; idx < dataLines.length; idx++) {
        const line = dataLines[idx];
        const parts = line.split(',');

        if (parts.length < 4) {
            failedRecords.push(`${idx + 2},${line},列数不足`);
            continue;
        }

        let [key_id, level, shop_id, shop_name] = parts.map(p => p.trim());
        const originalShopId = shop_id;

        // 清理店铺ID
        shop_id = shop_id.replace(/\s+/g, '').replace(/[^0-9a-zA-Z]/g, '');

        // 检查问题
        let reason = '';

        if (!shop_id) {
            reason = '店铺ID为空';
        } else if (!key_id) {
            reason = 'KEY为空';
        } else if (!level || !['S', 'A', 'B', 'C', 'N'].includes(level)) {
            reason = `无效的KEY标签: "${level}"`;
        } else if (!shop_name) {
            reason = '店铺名称为空';
        }

        if (reason) {
            failedRecords.push(`${idx + 2},"${key_id}","${level}","${originalShopId}","${shop_name}",${reason}`);
        }
    }

    // 输出失败记录
    console.log(`\n共发现 ${failedRecords.length - 1} 条问题记录：\n`);

    // 保存到文件
    fs.writeFileSync('./failed_shops.csv', failedRecords.join('\n'), 'utf-8');
    console.log('已导出到: failed_shops.csv\n');

    // 打印前20条
    console.log('前20条问题记录：');
    console.log('='.repeat(80));
    failedRecords.slice(1, 21).forEach(r => console.log(r));
}

checkFailedRecords().catch(console.error);
