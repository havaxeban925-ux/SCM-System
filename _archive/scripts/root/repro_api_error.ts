
import fetch from 'node-fetch';

async function testPrivateStyles() {
    try {
        const API_BASE = 'http://localhost:3001';
        console.log(`Fetching ${API_BASE}/api/styles/private?pageSize=1000 ...`);

        const res = await fetch(`${API_BASE}/api/styles/private?pageSize=1000`);

        if (!res.ok) {
            console.error('Error Status:', res.status, res.statusText);
            const text = await res.text();
            console.error('Error Body:', text);
        } else {
            console.log('Success!');
            const data = await res.json();
            console.log('Data length:', data.data?.length);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testPrivateStyles();
