
async function checkShop() {
    const shopId = '5efe3196-77ce-470c-9662-169440d3a484';
    console.log(`Querying shop with ID: ${shopId}`);

    try {
        const res = await fetch('http://localhost:3001/api/admin/shops?pageSize=1000');
        if (!res.ok) {
            console.error('Failed to fetch shops:', res.statusText);
            return;
        }
        const json = await res.json();
        const shop = (json.data || []).find((s: any) => s.id === shopId);

        if (shop) {
            console.log('Shop Details:');
            console.log(`ID: ${shop.id}`);
            console.log(`Name: ${shop.shop_name}`);
            console.log(`KEY: ${shop.key_id}`);
            console.log(`Code: ${shop.shop_code}`);

            if (shop.shop_name === '春秋女装旗舰店') {
                console.log('MATCH: Name matches user query.');
            } else {
                console.log('MISMATCH: Name does not match.');
            }
        } else {
            console.log('Shop not found.');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

checkShop();
