import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/spu - 获取 SPU 库
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await supabase
        .from('sys_spu')
        .select(`
            *,
            b_style_demand (
                ref_link
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) return res.status(500).json({ error: error.message });

    // Flatten logic if needed, but for now just return
    const formatted = (data || []).map(item => ({
        id: item.id,
        spu_code: item.spu_code,
        image_url: item.image_url,
        created_at: item.created_at,
        link: item.b_style_demand?.ref_link || ''
    }));

    res.json({ data: formatted, total: count || 0, page, pageSize });
});

export default router;
