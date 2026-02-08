import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/development - 获取开发中款式（支持分页和状态筛选）
// 问题5修复：添加shopId过滤实现商家数据隔离
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const devStatus = req.query.status as string;
    const shopId = req.query.shopId as string; // 问题5：商家数据隔离
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_style_demand')
        .select('*', { count: 'exact' })
        .eq('status', 'developing')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    // 问题5：如果提供了shopId，则只返回该商家的数据
    if (shopId) query = query.eq('shop_id', shopId);
    if (devStatus) query = query.eq('development_status', devStatus);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Join with sys_shop to get shop_code
    const shopIds = Array.from(new Set((data || []).map(s => s.shop_id).filter(Boolean)));
    const shopMap = new Map();
    if (shopIds.length > 0) {
        const { data: shops } = await supabase
            .from('sys_shop')
            .select('id, shop_code, key_id')
            .in('id', shopIds);
        (shops || []).forEach(s => shopMap.set(s.id, s));
    }

    const joinedData = (data || []).map(s => ({
        ...s,
        shop_code: shopMap.get(s.shop_id)?.shop_code || '',
        key_id: shopMap.get(s.shop_id)?.key_id || ''
    }));

    res.json({ data: joinedData, total: count || 0, page, pageSize });
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
    const { schemes, remark } = req.body;

    // Check current status
    const { data: current } = await supabase.from('b_style_demand').select('development_status, shop_id, shop_name, name, image_url, remark, timestamp_label, days_left, status, extra_info').eq('id', id).single();

    // If currently in 'pattern' status, create a new work order for 'helping'
    if (current?.development_status === 'pattern') {
        // Create a new record for the helping request
        const newRecord = {
            shop_id: current.shop_id,
            shop_name: current.shop_name,
            name: current.name,
            image_url: current.image_url,
            remark: remark || current.remark,
            timestamp_label: current.timestamp_label,
            days_left: current.days_left,
            status: 'developing',
            development_status: 'helping',
            pattern_schemes: schemes || [],
            is_modify_img: true,
            real_img_url: schemes?.[0]?.images?.[0] || null,
            push_type: 'ASSIGN',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('b_style_demand').insert(newRecord);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, message: 'Created new helping work order' });
    }

    // Otherwise, update existing record (same type or from drafting)
    const updates: any = {
        development_status: 'helping',
        updated_at: new Date().toISOString()
    };
    if (remark) updates.remark = remark;

    // Clear old reply
    const newExtraInfo = { ...(current?.extra_info || {}) };
    delete newExtraInfo.reply;
    updates.extra_info = newExtraInfo;

    if (schemes && schemes.length > 0) {
        updates.pattern_schemes = schemes;
        updates.is_modify_img = true;
        const firstImg = schemes[0]?.images?.[0];
        if (firstImg) {
            updates.real_img_url = firstImg;
        }
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
            development_status: 'spu_verify',
            // status: 'completed', // 不再自动变更为 completed
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/development/:id/spu-confirm - SPU 审核通过 (录入 SPU 库)
router.post('/:id/spu-confirm', async (req, res) => {
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
    // 解析 back_spu (可能是空格分隔的多个SPU)
    const spuList = (style.back_spu || '').split(/\s+/).filter(Boolean);

    if (spuList.length === 0) {
        return res.status(400).json({ error: 'No SPU code found in back_spu' });
    }

    // 为每个 SPU 创建记录
    const spuInserts = spuList.map(code => ({
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
        console.error('Failed to insert sys_spu:', insertError);
        return res.status(500).json({ error: 'Failed to record SPU' });
    }

    // 3. 更新款式状态为 completed
    const { error: updateError } = await supabase
        .from('b_style_demand')
        .update({
            development_status: 'success', // 最终状态
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (updateError) return res.status(500).json({ error: updateError.message });

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
    const { schemes, remark } = req.body;

    // Check current status
    const { data: current } = await supabase.from('b_style_demand').select('development_status, shop_id, shop_name, name, image_url, remark, timestamp_label, days_left, status, extra_info').eq('id', id).single();

    // If currently in 'helping' status, create a new work order for 'pattern'
    if (current?.development_status === 'helping') {
        const newRecord = {
            shop_id: current.shop_id,
            shop_name: current.shop_name,
            name: current.name,
            image_url: current.image_url,
            remark: remark || current.remark,
            timestamp_label: current.timestamp_label,
            days_left: current.days_left,
            status: 'developing',
            development_status: 'pattern',
            pattern_schemes: schemes || [],
            is_modify_img: false,
            push_type: 'ASSIGN',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('b_style_demand').insert(newRecord);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, message: 'Created new pattern work order' });
    }

    // Otherwise, update existing record
    const updates: any = {
        development_status: 'pattern',
        pattern_schemes: schemes || [],
        updated_at: new Date().toISOString()
    };
    if (remark) updates.remark = remark;

    const { error } = await supabase
        .from('b_style_demand')
        .update(updates)
        .eq('id', id);

    // Clear reply
    const newExtraInfo = { ...(current?.extra_info || {}) };
    delete newExtraInfo.reply;
    await supabase.from('b_style_demand').update({ extra_info: newExtraInfo }).eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default router;
