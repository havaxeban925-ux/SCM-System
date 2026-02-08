
// Test dashboard endpoint
async function test() {
    try {
        const res = await fetch('http://localhost:3001/api/admin/dashboard');
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text.substring(0, 500));
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
