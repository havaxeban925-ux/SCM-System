
import { getSupabase } from './server/lib/supabase';

async function checkTables() {
    const supabase = getSupabase();

    console.log('Checking tables...');

    const { data: spuTable, error: spuError } = await supabase
        .from('sys_spu')
        .select('*')
        .limit(1);

    if (spuError) {
        console.log('sys_spu table check failed (likely does not exist):', spuError.message);
    } else {
        console.log('sys_spu table exists.');
    }

    const { data: demandCols, error: demandError } = await supabase
        .from('b_style_demand')
        .select('*')
        .limit(1);

    if (demandError) {
        console.log('b_style_demand error:', demandError.message);
    } else if (demandCols && demandCols.length > 0) {
        console.log('b_style_demand columns:', Object.keys(demandCols[0]));
    }
}

checkTables();
