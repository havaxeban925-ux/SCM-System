
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

// Shop ID (Shop Code) to find
const TARGET_ID = '634418224581687';

async function checkCsvRow() {
    const buffer = fs.readFileSync('./商家情况.csv');
    const csv = iconv.decode(buffer, 'gbk');
    const lines = csv.split(/\r?\n/);

    console.log('Total Lines:', lines.length);
    console.log('Header:', lines[0]);

    const targetLine = lines.find(line => line.includes(TARGET_ID));

    if (targetLine) {
        console.log('Found Line:', targetLine);
        console.log('Parts:', targetLine.split(','));
        // Print char codes of parts[1] (Level)
        const parts = targetLine.split(',');
        const level = parts[1];
        console.log(`Level value: "${level}"`);
        console.log('Level value hex:', Buffer.from(level).toString('hex'));
    } else {
        console.log('Target ID not found.');
    }
}

checkCsvRow();
