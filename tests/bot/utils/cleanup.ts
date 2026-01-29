/**
 * SCM 测试机器人 - 测试数据清理工具
 * 
 * 用于清理自动化测试产生的数据
 */

import { createClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('请设置环境变量 SUPABASE_URL 和 SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('开始清理测试数据...\n');

    // 1. 清理测试款式
    console.log('清理测试款式...');
    const { error: styleError, count: styleCount } = await supabase
        .from('b_style_demand')
        .delete()
        .like('name', '%自动化测试%');

    if (styleError) {
        console.error('  清理款式失败:', styleError.message);
    } else {
        console.log(`  已删除 ${styleCount ?? 0} 条款式记录`);
    }

    // 2. 清理测试申请记录
    console.log('清理测试申请记录...');
    const { error: requestError, count: requestCount } = await supabase
        .from('b_request_record')
        .delete()
        .or('feedback.like.%自动化测试%,target_codes.cs.{SPU-ANOMALY-TEST%}');

    if (requestError) {
        console.error('  清理申请记录失败:', requestError.message);
    } else {
        console.log(`  已删除 ${requestCount ?? 0} 条申请记录`);
    }

    console.log('\n清理完成！');
}

cleanup().catch(err => {
    console.error('清理失败:', err);
    process.exit(1);
});
