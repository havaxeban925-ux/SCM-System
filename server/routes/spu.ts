import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/spu - 获取 SPU 库
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const offset = (page - 1) * pageSize;

    // OPT-11: Fetch all data and group in memory (MVP for < 2000 items)
    // To support large datasets, this should be a Database View.
    const { data, error } = await supabase
        .from('sys_spu')
        .select(`
            *,
            b_style_demand (
                ref_link
            )
        `)
        .order('created_at', { ascending: false })
        .limit(2000); // Fetch sufficient amount to group

    if (error) {
        console.error('Fetch SPU error:', error);
        return res.json({ data: [], total: 0, page, pageSize });
    }

    // Group by image_url
    const groupedMap = new Map<string, any>();

    (data || []).forEach(item => {
        // Normalization: Use image_url as primary key for style
        const key = item.image_url || `no-img-${item.id}`;

        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                ...item,
                spu_codes: new Set([item.spu_code].filter(Boolean))
            });
        } else {
            const existing = groupedMap.get(key);
            if (item.spu_code) {
                existing.spu_codes.add(item.spu_code);
            }
            // Keep the latest created_at
            if (new Date(item.created_at) > new Date(existing.created_at)) {
                existing.created_at = item.created_at;
            }
        }
    });

    const allGroups = Array.from(groupedMap.values());
    const total = allGroups.length;

    // Flatten and paginate
    const formatted = allGroups
        .slice(offset, offset + pageSize)
        .map(item => ({
            id: item.id,
            spu_code: Array.from(item.spu_codes).join(' '), // Convert Set to Array then join
            image_url: item.image_url,
            created_at: item.created_at,
            link: item.b_style_demand?.ref_link || ''
        }));

    res.json({ data: formatted, total, page, pageSize });
});

export default router;
