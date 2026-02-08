import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env
config({ path: '.env.local' });

const LOG_FILE = 'db_test_result.txt';
function log(msg: string) {
    fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
    console.log(msg);
}

// Clear log file
if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

log('SUPABASE_URL: ' + (supabaseUrl ? 'Found' : 'Missing'));
log('SUPABASE_KEY: ' + (supabaseKey ? 'Found' : 'Missing'));

if (!supabaseUrl || !supabaseKey) {
    log('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTable(tableName: string) {
    try {
        log(`Testing table: ${tableName} (HEAD)...`);
        // Test 1: HEAD
        const t1 = Date.now();
        const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        const d1 = Date.now() - t1;
        if (error) {
            log(`❌ Error querying ${tableName} (HEAD): ${error.message}`);
        } else {
            log(`✅ ${tableName} (HEAD): ${count} rows (${d1}ms)`);
        }

        // Test 2: Select 1 row
        log(`Testing table: ${tableName} (SELECT 1)...`);
        const t2 = Date.now();
        const { data, error: err2 } = await supabase
            .from(tableName)
            .select('id') // assuming id exists, or *
            .limit(1);
        const d2 = Date.now() - t2;

        if (err2) {
            log(`❌ Error querying ${tableName} (SELECT): ${err2.message}`);
        } else {
            log(`✅ ${tableName} (SELECT): ${data?.length} row returned (${d2}ms)`);
        }

    } catch (e: any) {
        log(`❌ Exception querying ${tableName}: ${e.message}`);
    }
}

async function main() {
    log('--- Starting tests ---');
    await testTable('sys_shop');

    log('Checking b_public_style...');
    await testTable('b_public_style');

    log('Checking b_restock_order...');
    await testTable('b_restock_order');

    log('Checking b_request_record...');
    await testTable('b_request_record');

    log('Checking b_style_demand (suspected)...');
    await testTable('b_style_demand');


    // Check specific columns
    const checkColumn = async (table: string, col: string) => {
        try {
            const { error } = await supabase.from(table).select(col).limit(1);
            if (error) log(`❌ ${table}.${col} missing or error: ${error.message}`);
            else log(`✅ ${table}.${col} exists`);
        } catch (e: any) {
            log(`❌ Exception checking ${table}.${col}: ${e.message}`);
        }
    };

    if (true) {
        await checkColumn('sys_shop', 'created_at');
        await checkColumn('sys_shop', 'level');
        await checkColumn('sys_shop', 'key_id');

        await checkColumn('b_public_style', 'created_at');
        await checkColumn('b_public_style', 'intent_count');

        await checkColumn('b_style_demand', 'created_at');
        await checkColumn('b_style_demand', 'status');
        await checkColumn('b_style_demand', 'back_spu');
        await checkColumn('b_style_demand', 'extra_info'); // Suspected missing
        await checkColumn('b_style_demand', 'pattern_schemes'); // Suspected missing
        await checkColumn('b_style_demand', 'real_img_url'); // Suspected missing

        await checkColumn('b_request_record', 'type');
        await checkColumn('b_request_record', 'status');

        await checkColumn('b_restock_order', 'status');
    }
    // Query latest b_style_demand
    log('--- Latest b_style_demand record ---');
    const { data: latest, error: latError } = await supabase
        .from('b_style_demand')
        .select('id, name, status, development_status, extra_info, pattern_schemes')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (latError) {
        log(`Error fetching latest: ${latError.message}`);
    } else {
        log(JSON.stringify(latest, null, 2));
    }

    log('Main finished.');
}

main();
