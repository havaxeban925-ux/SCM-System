import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

function generateNo(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// GET /api/requests - 获取申请记录（支持分页和类型筛选）
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const type = req.query.type as string;
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_request_record')
        .select('*', { count: 'exact' })
        .order('submit_time', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (type) query = query.eq('type', type);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// POST /api/requests/quote - 创建核价申请
router.post('/quote', async (req, res) => {
    const { subType, shopName, quotes } = req.body;
    const targetCodes = quotes.map((q: any) => q.code);

    const { data: record, error: recordError } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: subType,
            target_codes: targetCodes,
            status: 'processing',
            shop_name: shopName,
            pricing_details: quotes.map((q: any) => ({
                skc: q.code,
                appliedPrice: q.price,
                buyerPrice: null,
                status: '复核中',
                time: new Date().toISOString().split('T')[0]
            }))
        })
        .select()
        .single();

    if (recordError) return res.status(500).json({ error: recordError.message });

    // 创建关联的报价工单
    // for (const quote of quotes) {
    //     await supabase
    //         .from('b_quote_order')
    //         .insert({
    //             request_id: record.id,
    //             quote_no: generateNo('QT'),
    //             shop_name: shopName,
    //             type: quote.type,
    //             skc_code: quote.type === 'NORMAL' ? quote.code : undefined,
    //             style_no: quote.type === 'WOOL' ? quote.code : undefined,
    //             total_price: quote.price,
    //             status: 0,
    //             // detail_json: quote.detailJson // Column likely missing
    //         });
    // }

    res.json(record);
});

// POST /api/requests/same-price - 创建同款同价申请
router.post('/same-price', async (req, res) => {
    const { shopName, items } = req.body;

    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: '同款同价',
            target_codes: items.map((i: any) => i.targetCode),
            status: 'processing',
            shop_name: shopName,
            pricing_details: items.map((i: any) => ({
                skc: i.targetCode,
                appliedPrice: parseFloat(i.suggestedPrice) || 0,
                buyerPrice: parseFloat(i.refPrice) || 0,
                status: '复核中',
                time: new Date().toISOString().split('T')[0],
                refCode: i.refCode
            }))
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/requests/price-increase - 创建涨价申请
router.post('/price-increase', async (req, res) => {
    const { shopName, items } = req.body;

    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: '申请涨价',
            target_codes: items.map((i: any) => i.targetCode),
            status: 'processing',
            shop_name: shopName,
            pricing_details: items.map((i: any) => ({
                skc: i.targetCode,
                appliedPrice: parseFloat(i.increasePrice) || 0,
                buyerPrice: null,
                status: '复核中',
                time: new Date().toISOString().split('T')[0]
            }))
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/requests/anomaly - 创建异常申请
router.post('/anomaly', async (req, res) => {
    const { subType, targetCodes, content, shopName } = req.body;

    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'anomaly',
            sub_type: subType,
            target_codes: targetCodes,
            status: 'processing',
            shop_name: shopName,
            remark: content?.remark || content || null
        })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/requests/style-application - 创建款式申请
router.post('/style-application', async (req, res) => {
    const { applications } = req.body;

    if (!applications || applications.length === 0) {
        return res.status(400).json({ error: '没有款式申请数据' });
    }

    // 为每个款式申请创建一条记录
    const records = [];
    for (const app of applications) {
        const { data, error } = await supabase
            .from('b_request_record')
            .insert({
                type: 'style',
                sub_type: '申请发款',
                target_codes: [app.shopName], // 使用店铺名称作为标识
                status: 'processing',
                shop_name: app.shopName,
                pricing_details: [{
                    images: app.images,
                    remark: app.remark || '',
                    status: '待审核',
                    time: new Date().toISOString().split('T')[0]
                }]
            })
            .select()
            .single();

        if (error) {
            console.error('Style application insert error:', error);
            return res.status(500).json({ error: error.message });
        }
        records.push(data);
    }

    res.json({ success: true, records });
});

// POST /api/requests/:id/secondary-review - 二次核价
router.post('/:id/secondary-review', async (req, res) => {
    const { id } = req.params;
    const { skc, secondPrice, secondReason } = req.body;

    const { data: record, error: fetchError } = await supabase
        .from('b_request_record')
        .select('pricing_details')
        .eq('id', id)
        .single();

    if (fetchError || !record) {
        return res.status(404).json({ error: 'Record not found' });
    }

    const details = record.pricing_details as any[];
    const updatedDetails = details.map(d => {
        if (d.skc === skc) {
            return { ...d, secondPrice, secondReason, status: '复核中' };
        }
        return d;
    });

    const { error } = await supabase
        .from('b_request_record')
        .update({
            pricing_details: updatedDetails,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// PATCH /api/requests/:id/status - 更新申请状态
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const { error } = await supabase
        .from('b_request_record')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/requests/:id/audit - 审批申请（通过/驳回）
router.post('/:id/audit', async (req, res) => {
    const { id } = req.params;
    const { action, feedback, buyerPrices } = req.body;
    // action: 'approve' | 'reject'
    // feedback: 驳回原因
    // buyerPrices: 核价时的买手价格 { skc: price }

    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
    };

    // feedback 存入 pricing_details 的 JSON 中，因为 remark 字段不存在


    // 获取当前记录并更新 pricing_details（含 feedback）
    const { data: record } = await supabase
        .from('b_request_record')
        .select('pricing_details')
        .eq('id', id)
        .single();

    if (record?.pricing_details) {
        const details = record.pricing_details as any[];
        updates.pricing_details = details.map(d => ({
            ...d,
            buyerPrice: buyerPrices?.[d.skc] ?? d.buyerPrice,
            status: action === 'approve' ? '已通过' : '已驳回',
            feedback: feedback || d.feedback
        }));
    } else if (feedback) {
        // 如果没有 pricing_details，创建一个包含 feedback 的对象
        updates.pricing_details = [{ feedback }];
    }


    const { error } = await supabase
        .from('b_request_record')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// DELETE /api/requests/:id - 撤销/删除申请
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    // 只能撤销处理中的申请
    const { data: record, error: fetchError } = await supabase
        .from('b_request_record')
        .select('status')
        .eq('id', id)
        .single();

    if (fetchError || !record) {
        return res.status(404).json({ error: 'Record not found' });
    }

    if (record.status !== 'processing') {
        return res.status(400).json({ error: '只能撤销处理中的申请' });
    }

    const { error } = await supabase
        .from('b_request_record')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default router;
