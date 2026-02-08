
const shopId = '5efe3196-77ce-470c-9662-169440d3a484';
console.log(`Querying shop with ID: ${shopId}`);

fetch('http://localhost:3001/api/admin/shops?pageSize=1000')
    .then(res => res.json())
    .then(json => {
        const shop = (json.data || []).find(s => s.id === shopId);
        if (shop) {
            console.log('Shop Found:');
            console.log(JSON.stringify(shop, null, 2));
        } else {
            console.log('Shop not found.');
        }
    })
    .catch(err => console.error('Error:', err));
