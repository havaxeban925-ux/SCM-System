import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config();
config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env or .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ARCHIVE_ROOT = path.join(process.cwd(), '_archive', 'db');

// Ensure archive directory exists
if (!fs.existsSync(ARCHIVE_ROOT)) {
    fs.mkdirSync(ARCHIVE_ROOT, { recursive: true });
}

const TODAY = new Date().toISOString().split('T')[0];
const ARCHIVE_DIR = path.join(ARCHIVE_ROOT, TODAY);
if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// Config: Archive data older than X months
const MONTHS_TO_KEEP = 6;
const CUTOFF_DATE = new Date();
CUTOFF_DATE.setMonth(CUTOFF_DATE.getMonth() - MONTHS_TO_KEEP);
const CUTOFF_ISO = CUTOFF_DATE.toISOString();

console.log(`Archiving data older than: ${CUTOFF_ISO} (${MONTHS_TO_KEEP} months ago)`);

async function archiveTable(tableName: string, statusColumn: string | null, terminalStatuses: string[]) {
    console.log(`\nProcessing table: ${tableName}...`);

    let query = supabase
        .from(tableName)
        .select('*')
        .lt('created_at', CUTOFF_ISO);

    if (statusColumn && terminalStatuses.length > 0) {
        query = query.in(statusColumn, terminalStatuses);
    }

    // Supabase limit is usually 1000, we might need loops if data is huge.
    // For now, simpler fetch. If > 1000, we might strictly need pagination or range.
    // Let's use a meaningful limit.
    const { data, error } = await query.limit(5000);

    if (error) {
        console.error(`Error fetching data for ${tableName}:`, error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log(`No records found to archive for ${tableName}.`);
        return;
    }

    console.log(`Found ${data.length} records to archive.`);

    // 1. Write to file
    const filePath = path.join(ARCHIVE_DIR, `${tableName}.jsonl`);
    const stream = fs.createWriteStream(filePath, { flags: 'a' });

    data.forEach(row => {
        stream.write(JSON.stringify(row) + '\n');
    });
    stream.end();
    console.log(`Exported to ${filePath}`);

    // 2. Delete from DB
    // Delete in chunks of 20 to avoid "request too large" or timeouts
    const CHUNK_SIZE = 50;
    const ids = data.map((row: any) => row.id);
    let deletedCount = 0;

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error: delError } = await supabase
            .from(tableName)
            .delete()
            .in('id', chunk);

        if (delError) {
            console.error(`Failed to delete chunk ${i}:`, delError.message);
        } else {
            deletedCount += chunk.length;
            process.stdout.write(`\rDeleted: ${deletedCount}/${ids.length}`);
        }
    }
    console.log(`\nArchived and deleted ${deletedCount} records from ${tableName}.`);
}

async function main() {
    // 1. b_style_demand (Styles)
    // Terminal statuses: rejected, completed (maybe? usually we keep completed for history, but if ancient...)
    // Let's archive 'rejected' and 'cancelled' for sure. 'completed' might be needed for stats?
    // User plan said: "rejected, cancelled, or completed".
    await archiveTable('b_style_demand', 'status', ['rejected', 'cancelled', 'completed']);

    // 2. b_restock_order (Restock)
    // Terminal: cancelled, completed, rejected
    await archiveTable('b_restock_order', 'status', ['cancelled', 'completed', 'rejected']);

    // 3. b_request_record (Pricing/Anomaly)
    // Terminal: approved, rejected, completed
    await archiveTable('b_request_record', 'status', ['approved', 'rejected', 'completed']);

    console.log('\nArchiving process finished.');
}

main().catch(err => console.error(err));
