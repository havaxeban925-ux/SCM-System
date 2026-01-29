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
        .in('status', ['locked', 'new'])
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (shopId) query = query.eq('shop_id', shopId);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
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

// POST /api/styles/public/:id/intent - 表达意向
router.post('/public/:id/intent', async (req, res) => {
    const { id } = req.params;

    const { data: style, error: fetchError } = await supabase
        .from('b_public_style')
        .select('intent_count, max_intents')
        .eq('id', id)
        .single();

    if (fetchError || !style) {
        return res.status(404).json({ error: 'Style not found' });
    }

    if (style.intent_count >= style.max_intents) {
        return res.status(400).json({ error: 'Max intents reached' });
    }

    const { error } = await supabase
        .from('b_public_style')
        .update({ intent_count: style.intent_count + 1 })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
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
        confirm_time: new Date().toISOString()
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

export default router;
