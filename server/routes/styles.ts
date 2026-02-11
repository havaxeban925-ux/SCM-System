import { Router } from 'express';
import { supabase } from '../lib/supabase';
import crypto from 'crypto';

const router = Router();

// GET /api/styles/private - 获取私推款式（支持分页和筛选）
router.get('/private', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const shopId = req.query.shopId as string;
    const offset = (page - 1) * pageSize;

    const status = req.query.status as string; // Get status from query

    let query = supabase
        .from('b_style_demand')
        .select('*, sys_shop(shop_code)', { count: 'exact' });

    // Handle status filter
    if (status === 'all') {
        // No filter, return all
    } else if (status) {
        query = query.eq('status', status);
    } else {
        query = query.in('status', ['locked', 'new']);
    }

    query = query.order('created_at', { ascending: false });

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

    if (error) {
        // If range is invalid (e.g. empty table), Supabase might return error 416 or similar, 
        // but typically it just returns empty data. 
        // We log it but don't crash if it's just a range issue.
        console.error('Fetch public styles error:', error);
        return res.json({ data: [], total: 0, page, pageSize });
    }
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
            status: 'rejected',
            development_status: null,
            confirm_time: null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/styles/public/:id/intent - 表达意向
// 表达意向（修复：不仅增加计数，还创建私有记录）
router.post('/public/:id/intent', async (req, res) => {
    const { id } = req.params;
    const { shopId, shopName } = req.body; // Expect shop info from frontend

    try {
        // 1. Get Public Style to copy details
        const { data: style, error: fetchError } = await supabase
            .from('b_public_style')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !style) {
            return res.status(404).json({ error: 'Public style not found' });
        }

        if (style.intent_count >= style.max_intents) {
            return res.status(400).json({ error: 'Max intents reached' });
        }

        // 2. Create new record in b_style_demand (Private List)
        const newStyle = {
            id: crypto.randomUUID(),
            shop_id: shopId, // Must be provided by frontend
            shop_name: shopName,
            name: style.name,
            category: style.category,
            image_url: style.image_url,
            // intent_price: style.price, // Optional if we want to carry over price
            status: 'new', // Appears in Private List as New
            push_type: 'POOL',
            source_public_id: id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // No development_status yet, or maybe 'wait_confirm'? 'new' is fine for Private List.
        };

        const { error: insertError } = await supabase
            .from('b_style_demand')
            .insert(newStyle);

        if (insertError) {
            console.error('Error creating private intent record:', insertError);
            return res.status(500).json({ error: 'Failed to create intent record' });
        }

        // 3. Increment intent count in Public Style
        const { error: updateError } = await supabase
            .from('b_public_style')
            .update({ intent_count: style.intent_count + 1 })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating public style intent count:', updateError);
            // Non-critical if insert succeeded, but good to log.
        }

        res.json({ success: true, message: 'Intent recorded and added to private list' });
    } catch (error) {
        console.error('Error handling intent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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
        ref_link: publicStyle?.ref_link, // Fix: Copy ref_link
        remark: '从公海池直接接款开发',
        timestamp_label: '刚刚',
        status: 'developing',
        development_status: 'drafting',
        confirm_time: new Date().toISOString(),
        source_public_id: id // OPT-10: 记录公池来源
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
