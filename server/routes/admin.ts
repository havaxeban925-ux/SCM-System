import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============ 看板数据 ============

// GET /api/admin/dashboard - 获取看板数据
router.get('/dashboard', async (req, res) => {
    try {
        // Helper to safely fetch count
        const safeCount = async (table: string, query?: (q: any) => any) => {
            try {
                let q = supabase.from(table).select('*', { count: 'exact', head: true });
                if (query) q = query(q);
                const { count, error } = await q;
                if (error) {
                    console.error(`Error counting ${table}:`, error);
                    return 0;
                }
                return count || 0;
            } catch (e) {
                console.error(`Exception counting ${table}:`, e);
                return 0;
            }
        };

        // 1. Shop Total
        const shopTotal = await safeCount('sys_shop');

        // 2. Shop Levels Distribution & 3. KEY Total Source
        let allShops: any[] = [];
        let shopLevels = { S: 0, A: 0, B: 0, C: 0, N: 0 };
        try {
            let page = 0;
            const pageSize = 1000;
            while (true) {
                const { data, error } = await supabase
                    .from('sys_shop')
                    .select('level, key_id')
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                if (error) break; // Stop loop on error
                if (!data || data.length === 0) break;
                allShops = allShops.concat(data);
                if (data.length < pageSize) break;
                page++;
            }
            shopLevels = allShops.reduce((acc: any, curr) => {
                const lvl = curr.level || 'N';
                acc[lvl] = (acc[lvl] || 0) + 1;
                return acc;
            }, { S: 0, A: 0, B: 0, C: 0, N: 0 });
        } catch (e) {
            console.error('Error fetching shop levels:', e);
        }

        // 3. KEY Total
        // Re-use allShops if available, else fetch distinct keys (optimization omitted for safety)
        // Since we fetched allShops above, we can estimate keyTotal from it or fetch properly if needed.
        // For robustness, let's just use what we have in allShops or 0 if failed.
        // Actually, let's use a safe separate query if allShops failed? No, keep it simple.
        // If allShops is empty because of error, keyTotal will be 0.
        // Ideally we should try to fetch again if we really care, but this is fine.
        let keyTotal = 0;
        try {
            // Re-fetch all keys just to be safe/independent? No, reuse to be faster. 
            // If Shop Levels failed, keyTotal is 0. That's acceptable failure mode.
            // But wait, what if Shop Levels block failed but we still want Key Total? 
            // Let's rely on Safe Count of unique keys? Hard with Supabase API. 
            // Let's stick to the previous logic but inside a try/catch block if we didn't reuse.
            // We can reuse the loop data.
            if (allShops && allShops.length > 0) {
                const uniqueKeys = new Set(allShops.map(s => s.key_id).filter(Boolean));
                keyTotal = uniqueKeys.size;
            }
        } catch (e) {
            console.error('Error calculating Key Total:', e);
        }

        // 4. 工单统计
        const styleTotal = await safeCount('b_style_demand');
        const stylePending = await safeCount('b_style_demand', q => q.in('status', ['new', 'developing', 'helping']));

        const pricingTotal = await safeCount('b_request_record', q => q.eq('type', 'pricing'));
        const pricingPending = await safeCount('b_request_record', q => q.eq('type', 'pricing').eq('status', 'processing'));

        const anomalyTotal = await safeCount('b_request_record', q => q.eq('type', 'anomaly'));
        const anomalyPending = await safeCount('b_request_record', q => q.eq('type', 'anomaly').eq('status', 'processing'));

        const restockTotal = await safeCount('b_restock_order');
        const restockPending = await safeCount('b_restock_order', q => q.in('status', ['pending', 'processing']));

        // 5. SPU总数
        let spuTotal = 0;
        try {
            const { data: spuData, error: spuError } = await supabase
                .from('sys_spu')
                .select('spu_code');
            if (!spuError && spuData) {
                spuTotal = spuData.reduce((total, item) => {
                    const spuList = (item.spu_code || '').split(/\s+/).filter(Boolean);
                    return total + spuList.length;
                }, 0);
            }
        } catch (e) {
            console.error('Error fetching SPU total:', e);
        }

        // 6. 用户总数
        const userTotal = 4;

        res.json({
            stats: {
                key_total: keyTotal,
                shop_total: shopTotal,
                user_total: userTotal,
                spu_total: spuTotal,
                shop_levels: shopLevels,
                // 工单统计
                style_total: styleTotal,
                style_pending: stylePending,
                pricing_total: pricingTotal,
                pricing_pending: pricingPending,
                anomaly_total: anomalyTotal,
                anomaly_pending: anomalyPending,
                restock_total: restockTotal,
                restock_pending: restockPending
            },
            shop_levels: shopLevels
        });

    } catch (err: any) {
        console.error('Dashboard Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ 商铺管理 ============

// GET /api/admin/shops - 获取商铺列表
router.get('/shops', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const search = req.query.search as string;
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('sys_shop')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (search) {
        query = query.or(`shop_name.ilike.%${search}%,key_id.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// POST /api/admin/shops - 创建商铺
router.post('/shops', async (req, res) => {
    const { shopName, keyId, level, phone, bindingAccount } = req.body;

    const { data: newShop, error } = await supabase
        .from('sys_shop')
        .insert({
            shop_name: shopName,
            key_id: keyId,
            level: level || 'N',
            phone: phone,
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // 如果提供了关联账号，尝试绑定
    if (bindingAccount && bindingAccount.trim()) {
        const username = bindingAccount.trim();

        const { data: updatedUsers, error: userUpdateError } = await supabase
            .from('sys_user')
            .update({
                shop_name: shopName,
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('username', username)
            .select();

        if (userUpdateError) {
            return res.json({ ...newShop, warning: `商家创建成功，但账号绑定失败: ${userUpdateError.message}` });
        }

        if (!updatedUsers || updatedUsers.length === 0) {
            return res.json({ ...newShop, warning: '商家创建成功，但未找到对应的账号进行绑定，请检查账号是否拼写正确' });
        }
    }

    res.json(newShop);
});

// PATCH /api/admin/shops/:id - 更新商铺
router.patch('/shops/:id', async (req, res) => {
    const { id } = req.params;
    const { shopName, keyId, level, phone } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (shopName !== undefined) updates.shop_name = shopName;
    if (keyId !== undefined) updates.key_id = keyId;
    if (level !== undefined) updates.level = level;
    if (phone !== undefined) updates.phone = phone;

    const { error } = await supabase
        .from('sys_shop')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// DELETE /api/admin/shops/:id - 删除商铺
router.delete('/shops/:id', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('sys_shop')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// DELETE /api/admin/shops/:id/key - 删除商家的KEY（清空key_id字段）
router.delete('/shops/:id/key', async (req, res) => {
    const { id } = req.params;

    // 获取该店铺的key_id，找到所有相同的key_id的店铺
    const { data: shop, error: fetchError } = await supabase
        .from('sys_shop')
        .select('key_id')
        .eq('id', id)
        .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!shop || !shop.key_id) return res.status(400).json({ error: 'Shop has no KEY to delete' });

    const keyId = shop.key_id;

    // 清空所有拥有相同 key_id 的店铺的 key_id 字段
    const { error: updateError } = await supabase
        .from('sys_shop')
        .update({ key_id: null, updated_at: new Date().toISOString() })
        .eq('key_id', keyId);

    if (updateError) return res.status(500).json({ error: updateError.message });
    res.json({ success: true, message: `Cleared KEY "${keyId}" from all shops` });
});

// ============ 标签管理 ============

// GET /api/admin/tags - 获取标签列表
router.get('/tags', async (req, res) => {
    const category = req.query.category as string;

    let query = supabase
        .from('b_tag')
        .select('*')
        .order('sort_order', { ascending: true });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST /api/admin/tags - 创建标签
router.post('/tags', async (req, res) => {
    const { name, category, sortOrder } = req.body;

    const { data, error } = await supabase
        .from('b_tag')
        .insert({
            name,
            category, // 'visual' | 'style'
            sort_order: sortOrder || 0
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PATCH /api/admin/tags/:id - 更新标签
router.patch('/tags/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, sortOrder } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (sortOrder !== undefined) updates.sort_order = sortOrder;

    const { error } = await supabase
        .from('b_tag')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// DELETE /api/admin/tags/:id - 删除标签
router.delete('/tags/:id', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('b_tag')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ============ 推送管理 ============

// POST /api/admin/push/private - 私推
// POST /api/admin/push/private - 私推
router.post('/push/private', async (req, res) => {
    // OPT-1: 获取当前买手身份
    const buyerName = req.headers['x-buyer-name'] as string || 'Unknown';

    // 支持两种模式：
    // 1. 批量推送不同款式: { styles: [{ shopId, name, imageUrl, ... }] }
    // 2. 单款推送多店: { shopIds: [], name, imageUrl, ... }

    let stylesToInsert = [];

    if (req.body.styles && Array.isArray(req.body.styles)) {
        stylesToInsert = req.body.styles.map((s: any) => ({
            push_type: 'PRIVATE',
            shop_id: s.shopId,
            shop_name: s.shopName,
            image_url: s.imageUrl,
            name: s.name,
            ref_link: s.refLink || '', // Fix
            remark: s.remark,
            tags: s.tags,
            days_left: s.deadline || 3,
            status: 'new',
            timestamp_label: '刚刚',
            created_at: new Date().toISOString(),
            created_by: buyerName,
            handler_name: buyerName // Fix
        }));
    } else {
        const { shopIds, imageUrl, name, remark, deadline, tags } = req.body;
        if (!shopIds || !Array.isArray(shopIds)) {
            return res.status(400).json({ error: 'Invalid payload: shopIds or styles required' });
        }
        stylesToInsert = shopIds.map((shopId: string) => ({
            push_type: 'PRIVATE',
            shop_id: shopId,
            image_url: imageUrl,
            name,
            ref_link: req.body.refLink || '', // Fix: Save refLink
            remark,
            tags: tags || [],
            days_left: deadline || 3,
            status: 'new',
            timestamp_label: '刚刚',
            created_at: new Date().toISOString(),
            created_by: buyerName,
            handler_name: buyerName // Fix: Save handler_name
        }));
    }

    // 前端传deadline（天数），后端存储为days_left字段

    const { data, error } = await supabase
        .from('b_style_demand')
        .insert(stylesToInsert)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, count: data?.length || 0 });
});

// POST /api/admin/push/public - 公推
router.post('/push/public', async (req, res) => {
    // OPT-1: 获取当前买手身份
    const buyerName = req.headers['x-buyer-name'] as string || 'Unknown';
    const { imageUrl, name, remark, tags, maxIntents } = req.body;

    const { data, error } = await supabase
        .from('b_public_style')
        .insert({
            image_url: imageUrl,
            name,
            ref_link: req.body.refLink || '', // Fix: Save refLink
            tags,
            max_intents: maxIntents || 5,
            intent_count: 0,
            created_by: buyerName
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/admin/push/transfer/public - 将私推款式转入公池
router.post('/push/transfer/public', async (req, res) => {
    const { styleId } = req.body;
    const buyerName = req.headers['x-buyer-name'] as string || 'Unknown';

    if (!styleId) {
        return res.status(400).json({ error: 'Style ID is required' });
    }

    try {
        // 1. 获取私推款式信息
        const { data: privateStyle, error: fetchError } = await supabase
            .from('b_style_demand')
            .select('*')
            .eq('id', styleId)
            .single();

        if (fetchError || !privateStyle) {
            return res.status(404).json({ error: 'Private style not found' });
        }

        // 2. 插入到公池 b_public_style
        // 注意：公池不需要 shop_id，且 ref_link 从私推记录继承
        const { data: publicStyle, error: insertError } = await supabase
            .from('b_public_style')
            .insert({
                image_url: privateStyle.image_url,
                name: privateStyle.name,
                ref_link: privateStyle.ref_link || '',
                tags: privateStyle.tags || [],
                max_intents: 5, // 默认额度
                intent_count: 0,
                created_by: buyerName,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        // 3. 更新私推记录状态（可选，或者直接在前端更新显示）
        // 这里我们可以将私推记录标记为 'transferred' 或保持原样，
        // 但通常业务逻辑是：转入公池后，原私推记录流程结束或并不受影响。
        // 这里仅返回成功即可。

        res.json({ success: true, publicStyle });
    } catch (err: any) {
        console.error('Transfer to public pool error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/push/history-grouped - 获取分组后的推款历史
router.get('/push/history-grouped', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const filterType = req.query.type as string; // 'all', 'private', 'public'
    const search = req.query.search as string;

    try {
        // 1. Fetch data logic (similar to frontend but optimized)
        // We fetch enough records to form pages. Since we group by style, 100 records might yield 20 groups.
        // To be safe for "page 1", we fetch ~500 records. For deep pagination, this approach has limits,
        // but it's better than fetching EVERYTHING on client.
        const FETCH_LIMIT = 1000;

        const { data: privateData, error: privateError } = await supabase
            .from('b_style_demand')
            .select(`
                id, created_at, status, shop_id,
                image_url, name, ref_link, push_type,
                development_status, handler_name,
                sys_shop ( id, shop_name, key_id, shop_code )
            `)
            .order('created_at', { ascending: false })
            .limit(FETCH_LIMIT);

        if (privateError) {
            // Handle empty table or other non-critical errors
            console.error('Fetch private history error:', privateError);
            // If critical, we might want to throw, but for now let's allow partial data or empty
        }

        const { data: publicData, error: publicError } = await supabase
            .from('b_public_style')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(FETCH_LIMIT);

        if (publicError) {
            console.error('Fetch public history error:', publicError);
        }

        // 2. Grouping Logic
        const allRecords = [];

        // Group private styles
        const groupedMap = new Map();
        (privateData || []).forEach((s: any) => {
            // Key: image + name + link
            const key = `${s.image_url}|${s.name}|${s.ref_link || ''}`;

            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    id: s.id,
                    link: s.ref_link || '',
                    image_url: s.image_url || '',
                    style_name: s.name || '未命名款式',
                    push_type: 'private',
                    first_push_time: s.created_at,
                    last_push_time: s.created_at,
                    target_count: 3,
                    accepted_count: 0,
                    shops: [],
                    handler_name: s.handler_name
                });
            }

            const record = groupedMap.get(key);
            // Update time range
            if (new Date(s.created_at) < new Date(record.first_push_time)) record.first_push_time = s.created_at;
            if (new Date(s.created_at) > new Date(record.last_push_time)) record.last_push_time = s.created_at;

            // Determine Status
            let status = 'pending';
            if (s.status === 'developing') status = 'accepted';
            else if (s.status === 'rejected') status = 'rejected';
            else if (s.status === 'abandoned') status = 'abandoned';

            if (status === 'accepted') record.accepted_count++;

            // Shop info from join
            const shopInfo = s.sys_shop || { shop_name: '未知店铺' };

            record.shops.push({
                id: s.shop_id,
                name: shopInfo.shop_name,
                key_id: shopInfo.key_id,
                key_name: shopInfo.key_id, // Fallback to key_id since key_name doesn't exist
                shop_code: shopInfo.shop_code,
                status: status,
                development_status: s.development_status,
                push_time: s.created_at
            });
        });

        allRecords.push(...Array.from(groupedMap.values()));

        // Public styles (usually unique)
        (publicData || []).forEach((s: any) => {
            allRecords.push({
                id: s.id,
                link: s.ref_link || '',
                image_url: s.image_url || '',
                style_name: s.name || '未命名款式',
                push_type: 'public',
                first_push_time: s.created_at,
                last_push_time: s.created_at,
                target_count: s.max_intents || 3,
                accepted_count: s.intent_count || 0,
                shops: [] // Public styles display differently in frontend, or have no specific shops yet
            });
        });

        // 3. Sort & Filter & Paginate
        // Sort by last_push_time desc
        allRecords.sort((a, b) => new Date(b.last_push_time).getTime() - new Date(a.last_push_time).getTime());

        // Filter
        let filtered = allRecords;
        if (filterType && filterType !== 'all') {
            filtered = filtered.filter(r => r.push_type === filterType);
        }
        if (search) {
            const lower = search.toLowerCase();
            filtered = filtered.filter(r =>
                r.style_name.toLowerCase().includes(lower) ||
                r.link.toLowerCase().includes(lower) ||
                r.shops.some((s: any) => s.name.toLowerCase().includes(lower) || (s.key_name && s.key_name.toLowerCase().includes(lower)))
            );
        }

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const pageData = filtered.slice(start, start + pageSize);

        res.json({ data: pageData, total, page, pageSize });

    } catch (err: any) {
        console.error('Grouped history error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/styles/:id/reply - 回复帮看/打版请求
router.post('/styles/:id/reply', async (req, res) => {
    const { id } = req.params;
    const { replyImage, replyContent } = req.body;

    const { data: current, error: fetchError } = await supabase
        .from('b_style_demand')
        .select('extra_info, development_status')
        .eq('id', id)
        .single();

    if (fetchError || !current) {
        return res.status(404).json({ error: 'Style not found' });
    }

    const newExtraInfo = {
        ...(current.extra_info || {}),
        reply: {
            content: replyContent,
            image: replyImage,
            time: new Date().toISOString()
        }
    };

    const handlerName = decodeURIComponent(req.get('x-buyer-name') || '');

    const { error } = await supabase
        .from('b_style_demand')
        .update({
            extra_info: newExtraInfo,
            development_status: 'drafting',
            handler_name: handlerName, // Save handler name
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/admin/styles/:id/confirm - 确认SPU入库
router.post('/styles/:id/confirm', async (req, res) => {
    const { id } = req.params;

    // 1. 获取当前款式信息
    const { data: style, error: fetchError } = await supabase
        .from('b_style_demand')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !style) {
        return res.status(404).json({ error: 'Style not found' });
    }

    // 2. 插入到 sys_spu 表
    const spuList = (style.back_spu || '').split(/\s+/).filter(Boolean);

    if (spuList.length > 0) {
        const spuInserts = spuList.map((code: string) => ({
            style_demand_id: id,
            spu_code: code,
            image_url: style.image_url,
            shop_id: style.shop_id,
            created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
            .from('sys_spu')
            .insert(spuInserts);

        if (insertError) {
            if (insertError.code !== '23505') {
                console.error('Failed to insert sys_spu:', insertError);
            }
        }
    }

    // 3. 更新款式状态
    const { error: updateError } = await supabase
        .from('b_style_demand')
        .update({
            development_status: 'success',
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (updateError) return res.status(500).json({ error: updateError.message });
    res.json({ success: true });
});

// GET /api/admin/push/history - 推送历史
router.get('/push/history', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const pushType = req.query.type as string;
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_style_demand')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (pushType) query = query.eq('push_type', pushType);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// ============ SPU 库管理 ============

// GET /api/admin/spu - 获取SPU列表
router.get('/spu', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 500;
    const search = req.query.search as string;
    const offset = (page - 1) * pageSize;

    // 从已完成开发的款式中获取SPU
    let query = supabase
        .from('b_style_demand')
        .select('id, name, image_url, back_spu, shop_name, created_at', { count: 'exact' })
        .eq('status', 'completed')
        .not('back_spu', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (search) {
        query = query.or(`name.ilike.%${search}%,back_spu.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// DELETE /api/admin/spu/:id - 删除SPU记录（清除back_spu字段）
router.delete('/spu/:id', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('b_style_demand')
        .update({ back_spu: null })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ============ 款式管理（管理后台视角） ============

// GET /api/admin/styles - 获取所有款式（支持多状态筛选）
router.get('/styles', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const status = req.query.status as string;
    const shopId = req.query.shopId as string;
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_style_demand')
        .select('*, sys_shop(shop_name, key_id, shop_code)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (status && status !== 'all') query = query.eq('status', status);
    if (shopId) query = query.eq('shop_id', shopId);

    const { data, error, count } = await query;
    if (error) {
        console.error('Fetch admin styles error:', error);
        return res.json({ data: [], total: 0, page, pageSize });
    }
    const formattedData = (data || []).map((item: any) => ({
        ...item,
        shop_name: item.sys_shop?.shop_name || item.shop_name,
        key_id: item.sys_shop?.key_id,
        shop_code: item.sys_shop?.shop_code
    }));

    res.json({ data: formattedData, total: count || 0, page, pageSize });
});

// ============ 补货订单（管理后台视角） ============

// GET /api/admin/restock - 获取补货订单（管理后台）
router.get('/restock', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const status = req.query.status as string;
    const offset = (page - 1) * pageSize;

    // 中文状态 → 数据库英文状态映射
    const statusMap: Record<string, string> = {
        '待接单': 'pending',
        '待复核': 'reviewing',
        '生产中': 'producing',
        '待入仓': 'shipped',
        '已完成': 'completed',
        '已取消': 'cancelled',
        '已拒绝': 'rejected'
    };
    const dbStatus = status ? (statusMap[status] || status) : undefined;

    let query = supabase
        .from('b_restock_order')
        .select('*, sys_shop(shop_name, shop_code)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (dbStatus) query = query.eq('status', dbStatus);

    const { data, error, count } = await query;
    if (error) {
        console.error('Fetch admin restock error:', error);
        return res.json({ data: [], total: 0, page, pageSize });
    }
    const formatted = (data || []).map((item: any) => ({
        ...item,
        shop_name: item.sys_shop?.shop_code || item.sys_shop?.shop_name || '未知店铺',
    }));
    res.json({ data: formatted, total: count || 0, page, pageSize });
});

// ============ 演示数据清理 ============

// DELETE /api/admin/demo/cleanup - 清理演示数据
router.delete('/demo/cleanup', async (req, res) => {
    const { shopId } = req.body;

    if (!shopId) {
        return res.status(400).json({ error: 'Shop ID is required' });
    }

    try {
        // 1. 清理款式需求
        const { error: styleError } = await supabase
            .from('b_style_demand')
            .delete()
            .eq('shop_id', shopId);

        if (styleError) throw styleError;

        res.json({ success: true });
    } catch (err: any) {
        console.error('Cleanup Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ 系统数据清理 ============

// DELETE /api/admin/system/cleanup - 清空所有工单数据（款式、核价、异常、大货、公池）
router.delete('/system/cleanup', async (req, res) => {
    try {
        // 1. 清空款式工单 (b_style_demand)
        const { error: styleError } = await supabase
            .from('b_style_demand')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
        if (styleError) throw styleError;

        // 2. 清空核价/异常工单 (b_request_record)
        const { error: requestError } = await supabase
            .from('b_request_record')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (requestError) throw requestError;

        // 3. 清空大货工单 (b_restock_order)
        const { error: restockError } = await supabase
            .from('b_restock_order')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (restockError) throw restockError;

        // 4. 清空公池款式 (b_public_style)
        const { error: publicError } = await supabase
            .from('b_public_style')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (publicError) throw publicError;

        res.json({ success: true, message: 'All order data cleared' });
    } catch (err: any) {
        console.error('System Cleanup Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ OPT-3: 商家删除审批 ============

// GET /api/admin/shops/delete-requests - 获取删除申请列表
router.get('/shops/delete-requests', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('shop_delete_requests')
            .select('*')
            .eq('status', 'pending')
            .order('requested_at', { ascending: false });

        if (error) throw error;
        res.json({ requests: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/shops/delete-requests/:id/approve - 批准删除（级联物理删除）
router.post('/shops/delete-requests/:id/approve', async (req, res) => {
    const { id } = req.params;
    const buyerName = req.headers['x-buyer-name'] as string || 'Unknown';

    try {
        // 1. 获取删除申请详情
        const { data: request, error: reqError } = await supabase
            .from('shop_delete_requests')
            .select('shop_id, shop_name')
            .eq('id', id)
            .single();

        if (reqError || !request) {
            return res.status(404).json({ error: 'Delete request not found' });
        }

        const shopId = request.shop_id;
        const shopName = request.shop_name;

        // 2. 级联删除所有关联数据（注意顺序：子表 -> 父表）
        // 2.1 删除物流记录（b_restock_logistics.operator_id 引用 sys_shop）
        const { error: logisticsError } = await supabase
            .from('b_restock_logistics')
            .delete()
            .eq('operator_id', shopId);
        if (logisticsError) {
            console.error('Failed to delete logistics:', logisticsError);
            throw new Error(`Failed to delete logistics: ${logisticsError.message}`);
        }

        // 2.2 删除款式需求
        const { error: styleError } = await supabase
            .from('b_style_demand')
            .delete()
            .eq('shop_id', shopId);
        if (styleError) {
            console.error('Failed to delete styles:', styleError);
            throw new Error(`Failed to delete styles: ${styleError.message}`);
        }

        // 2.3 删除补货订单
        const { error: restockError } = await supabase
            .from('b_restock_order')
            .delete()
            .eq('shop_id', shopId);
        if (restockError) {
            console.error('Failed to delete restock orders:', restockError);
            throw new Error(`Failed to delete restock orders: ${restockError.message}`);
        }

        // 2.4 删除申请记录
        const { error: requestError } = await supabase
            .from('b_request_record')
            .delete()
            .eq('shop_name', shopName);
        if (requestError) {
            console.error('Failed to delete request records:', requestError);
            throw new Error(`Failed to delete request records: ${requestError.message}`);
        }

        // 2.5 删除用户
        const { error: userError } = await supabase
            .from('sys_user')
            .delete()
            .eq('shop_name', shopName);
        if (userError) {
            console.error('Failed to delete users:', userError);
            throw new Error(`Failed to delete users: ${userError.message}`);
        }

        // 3. 更新删除申请状态（必须在删除 shop 之前，因为 shop_delete_requests.shop_id 引用 sys_shop）
        // 先置空 shop_id 以解除外键约束
        const { error: updateError } = await supabase.from('shop_delete_requests').update({
            shop_id: null,
            status: 'approved',
            processed_by: buyerName,
            processed_at: new Date().toISOString()
        }).eq('id', id);
        if (updateError) throw new Error(`Failed to update delete request: ${updateError.message}`);

        // 2.6 删除商铺本身
        const { error: shopError } = await supabase
            .from('sys_shop')
            .delete()
            .eq('id', shopId);
        if (shopError) {
            console.error('Failed to delete shop:', shopError);
            // 如果删除失败，可能需要回滚申请状态（此处暂不处理复杂回滚，主要确保顺序正确）
            throw new Error(`Failed to delete shop: ${shopError.message}`);
        }

        res.json({ success: true, message: 'Shop deleted successfully' });
    } catch (err: any) {
        console.error('Delete shop error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/shops/delete-requests/:id/reject - 驳回删除申请
router.post('/shops/delete-requests/:id/reject', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const buyerName = req.headers['x-buyer-name'] as string || 'Unknown';

    try {
        await supabase.from('shop_delete_requests').update({
            status: 'rejected',
            reject_reason: reason,
            processed_by: buyerName,
            processed_at: new Date().toISOString()
        }).eq('id', id);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
