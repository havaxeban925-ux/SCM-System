
import * as fs from 'fs';

const LOG_FILE = 'endpoint_test_result.txt';
function log(msg: string) {
    fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
    console.log(msg);
}

if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

async function main() {
    try {
        const urls = [
            'http://localhost:3001/api/admin/dashboard',
            'http://localhost:3001/api/styles/private?pageSize=10',
            'http://localhost:3001/api/admin/shops?pageSize=10'
        ];

        for (const url of urls) {
            log(`Fetching ${url}...`);
            try {
                const res = await fetch(url);
                log(`Status: ${res.status} ${res.statusText}`);
                const text = await res.text();
                // Check if it's HTML error page
                if (text.trim().startsWith('<!DOCTYPE html>')) {
                    log(`Body (HTML): ${text.substring(0, 200)}...`);
                } else {
                    log(`Body (JSON): ${text.substring(0, 500)}`);
                }
            } catch (e: any) {
                log(`Fetch error: ${e.message}`);
            }
            log('---');
        }
    } catch (e) {
        console.error(e);
    }
}

main();
