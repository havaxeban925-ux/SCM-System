/**
 * 诊断脚本：测试 shop 删除功能
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testShopDeletion() {
    console.log('🔧 Starting shop deletion diagnostic...\n');

    // 1. 创建测试店铺
    console.log('1. Creating test shop...');
    const { data: shop, error: createError } = await supabase
        .from('sys_shop')
        .insert({ shop_name: 'DiagTest', key_id: 'DIAG_001' })
        .select()
        .single();

    if (createError) {
        console.error('❌ Create failed:', createError);
        return;
    }
    console.log('✅ Shop created:', shop.id);

    // 2. 尝试删除
    console.log('\n2. Attempting to delete shop...');
    const { data: deleteResult, error: deleteError } = await supabase
        .from('sys_shop')
        .delete()
        .eq('id', shop.id);

    if (deleteError) {
        console.error('❌ Delete failed:', deleteError);
    } else {
        console.log('✅ Delete executed');
    }

    // 3. 验证删除结果
    console.log('\n3. Verifying deletion...');
    const { data: checkResult, error: checkError } = await supabase
        .from('sys_shop')
        .select('id')
        .eq('id', shop.id)
        .single();

    if (checkError?.code === 'PGRST116') {
        console.log('✅ Shop successfully deleted (not found)');
    } else if (checkResult) {
        console.error('❌ Shop still exists!', checkResult);
    }
}

testShopDeletion().catch(console.error);
