import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/development - 获取开发中款式（支持分页和状态筛选）
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const devStatus = req.query.status as string;
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_style_demand')
        .select('*', { count: 'exact' })
        .eq('status', 'developing')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (devStatus) query = query.eq('development_status', devStatus);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// PATCH /api/development/:id/status - 更新开发状态
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const updates: any = {
        development_status: status,
        updated_at: new Date().toISOString()
    };

    if (status === 'success') {
        updates.status = 'completed';
    }

    const { error } = await supabase
        .from('b_style_demand')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/development/:id/helping - 申请帮看
router.post('/:id/helping', async (req, res) => {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const updates: any = {
        development_status: 'helping',
        updated_at: new Date().toISOString()
    };

    if (imageUrl) {
        updates.real_img_url = imageUrl;
        updates.is_modify_img = true;
    }

    const { error } = await supabase
        .from('b_style_demand')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/development/:id/spu - 上传SPU
router.post('/:id/spu', async (req, res) => {
    const { id } = req.params;
    const { spuList } = req.body;

    const { error } = await supabase
        .from('b_style_demand')
        .update({
            back_spu: spuList,
            development_status: 'success',
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/development/:id/abandon - 放弃开发
router.post('/:id/abandon', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
        .from('b_style_demand')
        .update({
            status: 'abandoned',
            development_status: null,
            confirm_time: null,
            remark: reason ? `放弃原因: ${reason}` : undefined,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/development/:id/confirm-ok - 确认帮看通过
router.post('/:id/confirm-ok', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('b_style_demand')
        .update({
            development_status: 'ok',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/development/:id/pattern - 打版帮看
router.post('/:id/pattern', async (req, res) => {
    const { id } = req.params;
    const { schemes } = req.body;
    // schemes: [{ name: '方案1', images: ['url1', 'url2'] }]

    const { error } = await supabase
        .from('b_style_demand')
        .update({
            development_status: 'pattern',
            pattern_schemes: schemes || [],
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default router;
