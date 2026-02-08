
// Node.js script to test payload limit
async function test() {
    const sizeMB = 2; // 2MB
    const largeString = 'a'.repeat(sizeMB * 1024 * 1024);

    console.log(`Sending ${sizeMB}MB payload...`);

    try {
        const res = await fetch('http://localhost:3001/api/admin/push/private', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shopIds: ['test'],
                imageUrl: largeString, // Mock image
                name: 'Test Payload',
                remark: 'Test',
                tags: ['Visual', 'Style'],
                deadline: 3
            })
        });

        console.log('Status:', res.status);
        if (res.status === 413) {
            console.log('Error: 413 Payload Too Large');
        } else {
            const text = await res.text();
            console.log('Response:', text.substring(0, 100)); // Print first 100 chars
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
