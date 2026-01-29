import * as fs from 'fs';
// @ts-ignore
import iconv from 'iconv-lite';

const buffer = fs.readFileSync('./商家情况.csv');
const content = iconv.decode(buffer, 'gbk');

console.log('--- CONTENT START ---');
const lines = content.split(/[\r\n]+/).filter(l => l.trim());
for (let i = 0; i < 5; i++) {
    console.log(`Line ${i}: ${lines[i]}`);
}
console.log('--- CONTENT END ---');
