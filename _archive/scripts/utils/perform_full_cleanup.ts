
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function performFullCleanup() {
    console.log('🏁 Starting full data cleanup...');

    // 1. Clear Style Orders (b_style_demand)
    // Deleting everything where ID is not null (effectively truncate)
    const { error: styleError, count: styleCount } = await supabase
        .from('b_style_demand')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (styleError) console.error('❌ Error clearing b_style_demand:', styleError.message);
    else console.log(`✅ Cleared b_style_demand (${styleCount} rows)`);

    // 2. Clear Request Records (Pricing & Anomaly) (b_request_record)
    // Note: b_quote_order references b_request_record, so we might need to delete b_quote_order first if no cascade
    // But usually we delete parent and let cascade handle it, or delete child first. 
    // Let's delete b_quote_order first just in case to be safe, although schema says ON DELETE CASCADE for b_quote_order.

    const { error: quoteError, count: quoteCount } = await supabase
        .from('b_quote_order')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (quoteError) console.error('❌ Error clearing b_quote_order:', quoteError.message);
    else console.log(`✅ Cleared b_quote_order (${quoteCount} rows)`);


    const { error: reqError, count: reqCount } = await supabase
        .from('b_request_record')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (reqError) console.error('❌ Error clearing b_request_record:', reqError.message);
    else console.log(`✅ Cleared b_request_record (${reqCount} rows)`);

    // 3. Clear Restock Orders (b_restock_order)
    // Start with logistics just in case
    const { error: logError, count: logCount } = await supabase
        .from('b_restock_logistics')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (logError) console.error('❌ Error clearing b_restock_logistics:', logError.message);
    else console.log(`✅ Cleared b_restock_logistics (${logCount} rows)`);

    const { error: restockError, count: restockCount } = await supabase
        .from('b_restock_order')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (restockError) console.error('❌ Error clearing b_restock_order:', restockError.message);
    else console.log(`✅ Cleared b_restock_order (${restockCount} rows)`);

    // 4. Clear Public Pool (b_public_style)
    const { error: publicError, count: publicCount } = await supabase
        .from('b_public_style')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (publicError) console.error('❌ Error clearing b_public_style:', publicError.message);
    else console.log(`✅ Cleared b_public_style (${publicCount} rows)`);

    console.log('🎉 Cleanup complete!');
}

performFullCleanup().catch(console.error);
