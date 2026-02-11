
// using global fetch

async function testEndpoints() {
    const BASE = 'http://127.0.0.1:3001';
    console.log('Testing API Endpoints...');

    try {
        // 1. Health
        console.log('Fetching /api/health...');
        const health = await fetch(`${BASE}/api/health`);
        console.log('Health Status:', health.status);
        console.log('Health Body:', await health.text());

        // 2. Private Styles (triggered 500 error)
        console.log('Fetching /api/styles/private?pageSize=1...');
        const privateStyles = await fetch(`${BASE}/api/styles/private?pageSize=1`);
        console.log('Private Styles Status:', privateStyles.status);
        if (privateStyles.ok) {
            console.log('Private Styles Body:', await privateStyles.json());
        } else {
            console.log('Private Styles Error:', await privateStyles.text());
        }

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

testEndpoints();
