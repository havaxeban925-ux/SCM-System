import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testStyles() {
    try {
        console.log('Fetching styles with status=all...');
        const response = await fetch(`${API_BASE}/api/admin/styles?pageSize=10&status=all`);
        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Total:', data.total);
        console.log('Data length:', data.data?.length);
        if (data.data?.length > 0) {
            console.log('First item status:', data.data[0].status);
            console.log('First item sub_type:', data.data[0].sub_type);
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

testStyles();
