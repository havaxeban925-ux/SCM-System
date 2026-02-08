import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSpuData() {
    console.log('=== 开始修复 SPU 数据 ===\n');

    try {
        // 1. 获取所有 sys_spu 记录
        console.log('1. 获取当前 sys_spu 数据...');
        const { data: spuRecords, error: fetchError } = await supabase
            .from('sys_spu')
            .select('*');

        if (fetchError) {
            console.error('❌ 获取数据失败:', fetchError);
            return;
        }

        console.log(`   当前共有 ${spuRecords?.length || 0} 条记录`);

        // 2. 分析每条记录的 spu_code
        const recordsToFix: any[] = [];
        for (const record of spuRecords || []) {
            const spuList = (record.spu_code || '').split(/\s+/).filter(Boolean);
            if (spuList.length > 1) {
                console.log(`   发现多SPU记录: ID=${record.id}, spu_code="${record.spu_code}", 包含 ${spuList.length} 个SPU`);
                recordsToFix.push({
                    ...record,
                    spuList
                });
            }
        }

        if (recordsToFix.length === 0) {
            console.log('   ✓ 没有发现需要修复的数据');
            return;
        }

        // 3. 修复数据：删除旧记录，插入新记录
        console.log(`\n2. 开始修复 ${recordsToFix.length} 条记录...`);

        for (const record of recordsToFix) {
            // 删除旧记录
            const { error: deleteError } = await supabase
                .from('sys_spu')
                .delete()
                .eq('id', record.id);

            if (deleteError) {
                console.error(`   ❌ 删除记录 ${record.id} 失败:`, deleteError);
                continue;
            }

            // 为每个 SPU 创建新记录
            const newRecords = record.spuList.map((code: string) => ({
                style_demand_id: record.style_demand_id,
                spu_code: code,
                image_url: record.image_url,
                shop_id: record.shop_id,
                created_at: record.created_at || new Date().toISOString()
            }));

            const { error: insertError } = await supabase
                .from('sys_spu')
                .insert(newRecords);

            if (insertError) {
                console.error(`   ❌ 插入新记录失败 (原ID: ${record.id}):`, insertError);
            } else {
                console.log(`   ✓ 修复记录 ${record.id}: 1条 → ${newRecords.length}条`);
            }
        }

        // 4. 验证修复结果
        console.log('\n3. 验证修复结果...');
        const { data: finalData, error: finalError } = await supabase
            .from('sys_spu')
            .select('*');

        if (finalError) {
            console.error('❌ 验证失败:', finalError);
            return;
        }

        console.log(`   修复后共有 ${finalData?.length || 0} 条记录`);

        // 统计实际SPU数量
        const totalSpuCount = (finalData || []).reduce((total, item) => {
            const spuList = (item.spu_code || '').split(/\s+/).filter(Boolean);
            return total + spuList.length;
        }, 0);

        console.log(`   实际SPU数量: ${totalSpuCount}`);
        console.log('\n=== 修复完成 ===');

    } catch (err) {
        console.error('修复过程出错:', err);
    }
}

fixSpuData();
