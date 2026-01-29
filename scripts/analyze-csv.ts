import * as fs from 'fs';
import * as iconv from 'iconv-lite';

async function analyzeCsv() {
    console.log('Reading CSV...');
    const buffer = fs.readFileSync('./商家情况.csv');
    const csv = iconv.decode(buffer, 'gbk');
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');

    console.log('Total Non-empty Lines:', lines.length);

    // Header is line 0
    const header = lines[0].split(',');
    console.log('Header:', header);

    const keySet = new Set<string>();
    const shopSet = new Set<string>();

    // Index 0 is probably KEY, Index 2 is Shop ID? 
    // From previous logs: "Key Label" is index 1. 
    // Let's assume: 
    // Col 0: KEY_ID (e.g. KEY123)
    // Col 1: KEY_LABEL (e.g. S, A, N)
    // Col 2: SHOP_ID (e.g. 6344...)
    // Col 3: SHOP_NAME

    let validRows = 0;

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 3) continue;

        const key = parts[0]?.trim();
        const shopId = parts[2]?.trim();

        if (key) keySet.add(key);
        if (shopId) shopSet.add(shopId);
        validRows++;
    }

    console.log('--- Statistics ---');
    console.log('Unique KEY IDs:', keySet.size);
    console.log('Unique Shop IDs:', shopSet.size);
    console.log('Total Valid Rows:', validRows);
}

analyzeCsv();
