async function checkApi() {
    try {
        const res = await fetch('http://localhost:3001/api/admin/shops?page=1&pageSize=1');
        const json = await res.json();
        console.log('API Total:', json.total);
        console.log('Sample Shop:', json.data?.[0]?.shop_name);
    } catch (e) {
        console.error(e);
    }
}
checkApi();
