
// Node.js script to test 40MB and 60MB payload
async function send(sizeMB) {
    const largeString = 'a'.repeat(sizeMB * 1024 * 1024);
    console.log(`Testing ${sizeMB}MB payload...`);
    try {
        const res = await fetch('http://localhost:3001/api/admin/push/private', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shopIds: ['test'],
                imageUrl: largeString,
                name: 'Test Large',
                tags: []
            })
        });
        console.log(`${sizeMB}MB -> Status:`, res.status);
    } catch (e) {
        console.error(`${sizeMB}MB -> Error:`, e.message);
    }
}

async function run() {
    await send(40); // 40MB
    await send(60); // 60MB
}

run();
