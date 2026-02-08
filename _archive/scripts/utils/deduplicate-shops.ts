import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/admin';

async function deduplicate() {
    console.log('Fetching all shops iteratively...');
    let allShops: any[] = [];
    let page = 1;
    const pageSize = 1000;

    // 1. Fetch
    while (true) {
        const res = await fetch(`${API_BASE}/shops?page=${page}&pageSize=${pageSize}`);
        const json = await res.json();
        const shops = json.data || [];
        allShops = allShops.concat(shops);
        if (shops.length === 0 || allShops.length >= (json.total || 0)) break;
        page++;
    }
    console.log(`\nTotal fetched: ${allShops.length}`);

    // 2. Identify by NAME
    const nameMap = new Map<string, any[]>();
    for (const shop of allShops) {
        const name = shop.shop_name?.trim();
        if (!name) continue;
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name)?.push(shop);
    }

    let duplicatesToDelete: any[] = [];
    let keptCount = 0;

    for (const [name, list] of nameMap) {
        if (list.length > 1) {
            // Sort: validation (has code?) descending, then ID descending (newest?)
            // We want to KEEP the one with a shop_code if possible.
            list.sort((a, b) => {
                const aHasCode = !!a.shop_code;
                const bHasCode = !!b.shop_code;
                if (aHasCode && !bHasCode) return -1; // a comes first
                if (!aHasCode && bHasCode) return 1;
                return 0; // Keep existing order or sort by date? 
                // Using ID is proxy for date usually.
            });

            // Keep index 0, delete 1..n
            const toKeep = list[0];
            const toDel = list.slice(1);
            duplicatesToDelete = duplicatesToDelete.concat(toDel);
            keptCount++;
        } else {
            keptCount++;
        }
    }

    console.log(`Unique Names: ${keptCount}`);
    console.log(`Duplicates (by Name) to delete: ${duplicatesToDelete.length}`);

    if (duplicatesToDelete.length === 0) return;

    console.log('Starting deletion...');
    let deletedCount = 0;
    for (const shop of duplicatesToDelete) {
        try {
            const delRes = await fetch(`${API_BASE}/shops/${shop.id}`, { method: 'DELETE' });
            if (delRes.ok) {
                deletedCount++;
                if (deletedCount % 20 === 0) process.stdout.write('.');
            }
        } catch (e) { }
    }
    console.log(`\nDeleted ${deletedCount} records.`);
}

deduplicate();
