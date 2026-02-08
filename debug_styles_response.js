
// using native fetch


async function checkResponse() {
    try {
        const response = await fetch('http://localhost:3001/api/styles/private?page=1&pageSize=1');
        const json = await response.json();
        console.log('Status:', response.status);
        if (json.data && json.data.length > 0) {
            const item = json.data[0];
            console.log('ID:', item.id);
            console.log('Shop ID:', item.shop_id);
            console.log('Sys Shop:', JSON.stringify(item.sys_shop, null, 2));
        } else {
            console.log('No data found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkResponse();
