import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============ 看板数据 ============

// GET /api/admin/dashboard - 获取看板数据
router.get('/dashboard', async (req, res) => {
    try {
        // 1. Shop Total (使用 count 避免 1000 条限制)
        const { count: shopTotal, error: shopCountError } = await supabase
            .from('sys_shop')
            .select('*', { count: 'exact', head: true });
        if (shopCountError) throw shopCountError;

        // 2. Shop Levels Distribution (需要全量获取，用 range 绕过限制)
        let allShops: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
            const { data, error } = await supabase
                .from('sys_shop')
                .select('level, key_id')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            allShops = allShops.concat(data);
            if (data.length < pageSize) break;
            page++;
        }
        const shopLevels = allShops.reduce((acc: any, curr) => {
            const lvl = curr.level || 'N';
            acc[lvl] = (acc[lvl] || 0) + 1;
            return acc;
        }, { S: 0, A: 0, B: 0, C: 0, N: 0 });

        // 3. KEY Total (计算唯一 KEY 数量)
        // 从已获取的全量店铺数据中提取唯一的 key_id
        const uniqueKeys = new Set(
            allShops
                .map(s => s.key_id)
                .filter(k => k && k.trim() !== '')
        );
        const keyTotal = uniqueKeys.size;

        // 4. 各类工单统计
        // 款式工单 (b_style_demand)
        const { count: styleTotal, error: styleError } = await supabase
            .from('b_style_demand')
            .select('*', { count: 'exact', head: true });
        if (styleError) throw styleError;

        const { count: stylePending, error: stylePendingError } = await supabase
            .from('b_style_demand')
            .select('*', { count: 'exact', head: true })
            .in('status', ['new', 'developing', 'helping']);
        if (stylePendingError) throw stylePendingError;

        // 核价工单
        const { count: pricingTotal, error: pricingTotalError } = await supabase
            .from('b_request_record')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'pricing');
        if (pricingTotalError) throw pricingTotalError;

        const { count: pricingPending, error: pricingPendingError } = await supabase
            .from('b_request_record')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'pricing')
            .eq('status', 'processing');
        if (pricingPendingError) throw pricingPendingError;

        // 异常工单
        const { count: anomalyTotal, error: anomalyTotalError } = await supabase
            .from('b_request_record')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'anomaly');
        if (anomalyTotalError) throw anomalyTotalError;

        const { count: anomalyPending, error: anomalyPendingError } = await supabase
            .from('b_request_record')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'anomaly')
            .eq('status', 'processing');
        if (anomalyPendingError) throw anomalyPendingError;

        // 大货工单 (b_restock_order)
        const { count: restockTotal, error: restockTotalError } = await supabase
            .from('b_restock_order')
            .select('*', { count: 'exact', head: true });
        if (restockTotalError) throw restockTotalError;

        const { count: restockPending, error: restockPendingError } = await supabase
            .from('b_restock_order')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'processing']);
        if (restockPendingError) throw restockPendingError;

        // 5. SPU总数 (已完成且有SPU编码的款式)
        const { count: spuTotal, error: spuError } = await supabase
            .from('b_style_demand')
            .select('*', { count: 'exact', head: true })
            .not('back_spu', 'is', null)
            .neq('back_spu', '');
        if (spuError) throw spuError;

        // 6. 用户总数 (暂时返回固定4人，因为是硬编码的)
        const userTotal = 4;

        res.json({
            stats: {
                key_total: keyTotal || 0,
                shop_total: shopTotal || 0,
                user_total: userTotal,
                spu_total: spuTotal || 0,
                shop_levels: shopLevels,
                // 工单统计
                style_total: styleTotal || 0,
                style_pending: stylePending || 0,
                pricing_total: pricingTotal || 0,
                pricing_pending: pricingPending || 0,
                anomaly_total: anomalyTotal || 0,
                anomaly_pending: anomalyPending || 0,
                restock_total: restockTotal || 0,
                restock_pending: restockPending || 0
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
            remark: s.remark,
            tags: s.tags,
            days_left: s.deadline || 3,
            status: 'new',
            timestamp_label: '刚刚',
            created_at: new Date().toISOString(),
            created_by: buyerName
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
            remark,
            tags: tags || [],
            days_left: deadline || 3,
            status: 'new',
            timestamp_label: '刚刚',
            created_at: new Date().toISOString(),
            created_by: buyerName
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
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (status) query = query.eq('status', status);
    if (shopId) query = query.eq('shop_id', shopId);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// ============ 补货订单（管理后台视角） ============

// GET /api/admin/restock - 获取补货订单（管理后台）
router.get('/restock', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const status = req.query.status as string;
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_restock_order')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
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
