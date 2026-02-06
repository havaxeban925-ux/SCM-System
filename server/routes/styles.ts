import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/styles/private - 获取私推款式（支持分页和筛选）
router.get('/private', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const shopId = req.query.shopId as string;
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_style_demand')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    // 支持 status=all 查询全部状态，否则默认只查 locked,new
    const statusFilter = req.query.status as string;
    if (statusFilter !== 'all') {
        query = query.in('status', ['locked', 'new']);
    }

    // 如果传入了 shopId，则仅显示该商铺的私推；
    // 如果没有传且角色不是管理员，可能需要通过中间件处理，但这里我们先支持前端传参。
    if (shopId) {
        query = query.eq('shop_id', shopId);
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// GET /api/styles/quota-stats - 获取当前商铺的名额统计
router.get('/quota-stats', async (req, res) => {
    const { shopId } = req.query;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    // 统计逻辑：在 b_style_demand 中 status 为 locked 或 developing 的款式
    const { count, error } = await supabase
        .from('b_style_demand')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .in('status', ['locked', 'developing']);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
        current: count || 0,
        limit: 5 // 目前硬编码为 5，后续可扩展为从配置或商家等级获取
    });
});

// GET /api/styles/public - 获取公池款式（支持分页）
router.get('/public', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await supabase
        .from('b_public_style')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// POST /api/styles/:id/confirm - 确认接款
router.post('/:id/confirm', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('b_style_demand')
        .update({
            status: 'developing',
            development_status: 'drafting',
            confirm_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/styles/:id/abandon - 放弃接款
router.post('/:id/abandon', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('b_style_demand')
        .update({
            status: 'new',
            development_status: null,
            confirm_time: null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/styles/public/:id/intent - 表达意向（问题3修复：添加到私推）
router.post('/public/:id/intent', async (req, res) => {
    const { id } = req.params;
    const { shopId, shopName } = req.body;

    if (!shopId || !shopName) {
        return res.status(400).json({ error: 'shopId and shopName are required' });
    }

    // 查询当前款式状态
    const { data: style, error: fetchError } = await supabase
        .from('b_public_style')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !style) {
        return res.status(404).json({ error: 'Style not found' });
    }

    const newCount = style.intent_count + 1;

    // 创建私推记录（状态为locked，表示意向中）
    const { data: newDemand, error: insertError } = await supabase
        .from('b_style_demand')
        .insert({
            push_type: 'POOL',
            shop_id: shopId,
            shop_name: shopName,
            image_url: style.image_url,
            name: style.name,
            remark: '公池意向款',
            timestamp_label: '刚刚',
            status: 'locked', // 意向状态
            source_public_id: id,
            handler_name: decodeURIComponent(req.get('X-Buyer-Name') || ''), // OPT-1: 记录推款人(处理人)
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    // 更新公池计数
    const { error } = await supabase
        .from('b_public_style')
        .update({ intent_count: newCount })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, intentCount: newCount, demand: newDemand });
});

// POST /api/styles/public/:id/confirm - 从公池接款
router.post('/public/:id/confirm', async (req, res) => {
    const { id } = req.params;
    const { publicStyle, shopId, shopName } = req.body;

    const newStyle = {
        push_type: 'POOL',
        shop_id: shopId || null,
        shop_name: shopName || '公池商家',
        image_url: publicStyle?.image_url,
        name: publicStyle?.name,
        remark: '从公海池直接接款开发',
        timestamp_label: '刚刚',
        status: 'developing',
        development_status: 'drafting',
        confirm_time: new Date().toISOString(),
        source_public_id: id, // OPT-10: 记录公池来源
        handler_name: decodeURIComponent(req.get('X-Buyer-Name') || '') // OPT-1: 记录推款人
    };

    const { data, error } = await supabase
        .from('b_style_demand')
        .insert(newStyle)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // 更新公池意向数
    if (publicStyle) {
        await supabase
            .from('b_public_style')
            .update({ intent_count: (publicStyle.intent_count || 0) + 1 })
            .eq('id', id);
    }

    res.json(data);
});

// OPT-10: POST /api/styles/public/:id/give-up - 放弃公池意向，款式退回公池
router.post('/public/:id/give-up', async (req, res) => {
    const { id } = req.params;
    const { styleId } = req.body; // 私推记录ID

    try {
        // 1. 删除对应的私推记录
        if (styleId) {
            await supabase
                .from('b_style_demand')
                .delete()
                .eq('id', styleId);
        }

        // 2. 减少公池款式的意向计数
        const { data: publicStyle } = await supabase
            .from('b_public_style')
            .select('intent_count')
            .eq('id', id)
            .single();

        if (publicStyle) {
            await supabase
                .from('b_public_style')
                .update({
                    intent_count: Math.max((publicStyle.intent_count || 1) - 1, 0)
                })
                .eq('id', id);
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
