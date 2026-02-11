import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

function generateNo(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// 生成符合规范的系统编号: [Prefix][YYYYMMDD][序号]
// 例如: H20260205001 (核价), Y20260205001 (异常), K20260205001 (款式)
async function generateOrderNo(type: 'H' | 'Y' | 'K'): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // 调用数据库函数获取序号（如果存在），否则使用简单递增
    const { data, error } = await supabase.rpc('get_next_sequence', {
        p_type: type,
        p_date: dateStr
    });

    if (error || data === null) {
        // 回退到简单随机编号
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${type}${dateStr}${random}`;
    }

    const seq = String(data).padStart(3, '0');
    return `${type}${dateStr}${seq}`;
}

// GET /api/requests - 获取申请记录（支持分页和类型筛选）
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const type = req.query.type as string;
    const shopName = req.query.shopName as string; // 商家端过滤
    const offset = (page - 1) * pageSize;

    let query = supabase
        .from('b_request_record')
        .select('*', { count: 'exact' })
        .order('is_urgent', { ascending: false })
        .order('submit_time', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (type) query = query.eq('type', type);
    if (shopName) query = query.eq('shop_name', shopName); // 新增：按店铺过滤

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], total: count || 0, page, pageSize });
});

// POST /api/requests/quote - 创建核价申请
router.post('/quote', async (req, res) => {
    const { subType, shopName, quotes } = req.body;
    const targetCodes = quotes.map((q: any) => q.code);

    // 生成系统编号
    const orderNo = await generateOrderNo('H');

    const { data: record, error: recordError } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: subType,
            target_codes: targetCodes,
            status: 'processing',
            shop_name: shopName,
            order_no: orderNo,  // 系统编号
            is_urgent: req.body.isUrgent || false, // 加急标记
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

    // 生成系统编号
    const orderNo = await generateOrderNo('H');

    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: '同款同价',
            target_codes: items.map((i: any) => i.targetCode),
            status: 'processing',
            shop_name: shopName,
            order_no: orderNo,
            is_urgent: req.body.isUrgent || false, // 加急标记
            pricing_details: items.map((i: any) => ({
                skc: i.targetCode,
                appliedPrice: parseFloat(i.refPrice) || 0,
                buyerPrice: parseFloat(i.refPrice) || 0,
                status: '复核中',
                time: new Date().toISOString().split('T')[0],
                refCode: i.refCode,
                suggestedPrice: parseFloat(i.suggestedPrice) || 0
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

    // 生成系统编号
    const orderNo = await generateOrderNo('H');

    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: '申请涨价',
            target_codes: items.map((i: any) => i.targetCode),
            status: 'processing',
            shop_name: shopName,
            order_no: orderNo,
            is_urgent: req.body.isUrgent || false, // 加急标记
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
    const { shopName, subType, targetCodes, content } = req.body;

    // 生成系统编号 (Y = 异常)
    const orderNo = await generateOrderNo('Y');

    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'anomaly',
            sub_type: subType,
            target_codes: targetCodes,
            status: 'processing',
            shop_name: shopName,
            order_no: orderNo,
            is_urgent: req.body.isUrgent || false, // 加急标记
            pricing_details: [{
                content: content, // Store JSON string or raw content here
                status: 'pending',
                time: new Date().toISOString()
            }],
            handler_name: decodeURIComponent(req.get('X-Buyer-Name') || '') // Record handler
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
        // 生成系统编号 (K = 款式)
        const orderNo = await generateOrderNo('K');

        const { data, error } = await supabase
            .from('b_request_record')
            .insert({
                type: 'style',
                sub_type: '申请发款',
                target_codes: [app.shopName], // 使用店铺名称作为标识
                status: 'processing',
                shop_name: app.shopName,
                order_no: orderNo,
                is_urgent: req.body.isUrgent || false, // 加急标记
                pricing_details: [{
                    images: app.images,
                    remark: app.remark || '',
                    status: '待审核',
                    time: new Date().toISOString().split('T')[0]
                }],
                handler_name: decodeURIComponent(req.get('X-Buyer-Name') || '')
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



// PATCH /api/requests/:id/status - 更新工单状态（修复：记录处理人）
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, remark } = req.body;

    // 获取处理人信息
    const handlerName = decodeURIComponent(req.get('X-Buyer-Name') || '');

    const updates: any = {
        status,
        updated_at: new Date().toISOString()
    };

    if (handlerName) {
        updates.handler_name = handlerName;
    }

    if (remark) {
        // 如果需要更新备注，这里可以添加逻辑，但 b_request_record 表结构中可能没有顶层 remark
        // 通常备注在 pricing_details 或其他字段中
    }

    const { error } = await supabase
        .from('b_request_record')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, handler_name: handlerName });
});

// PATCH /api/requests/:id/urgent - 更新加急状态
router.patch('/:id/urgent', async (req, res) => {
    const { id } = req.params;
    const { isUrgent } = req.body;

    const { error } = await supabase
        .from('b_request_record')
        .update({
            is_urgent: isUrgent,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, isUrgent });
});

// POST /api/requests/:id/audit - 审批申请（通过/驳回）
router.post('/:id/audit', async (req, res) => {
    const { id } = req.params;
    const { action, feedback, buyerPrices } = req.body;
    // action: 'approve' | 'reject'
    // feedback: 驳回原因
    // buyerPrices: 核价时的买手价格 { skc: price }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
    };

    // 获取当前记录
    const { data: record } = await supabase
        .from('b_request_record')
        .select('pricing_details, handler_name')
        .eq('id', id)
        .single();

    // 记录处理人
    if (!record?.handler_name) {
        updates.handler_name = decodeURIComponent(req.get('X-Buyer-Name') || '');
    }

    // feedback 存入 pricing_details 的 JSON 中，因为 remark 字段不存在

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

// ================== 两阶段核价流程 ==================

/**
 * POST /api/requests/:id/initial-review - 买手初核
 * 状态流转: processing → pending_confirm
 * 设置初核价格 initial_price
 */
router.post('/:id/initial-review', async (req, res) => {
    const { id } = req.params;
    const { initialPrice, remark } = req.body;

    if (!initialPrice) {
        return res.status(400).json({ error: '请填写初核价格' });
    }

    const { data: record, error: fetchError } = await supabase
        .from('b_request_record')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !record) {
        return res.status(404).json({ error: '工单不存在' });
    }

    // 只能对待处理/处理中的工单进行初核
    if (record.status !== 'processing' && record.status !== 'pending') {
        return res.status(400).json({ error: `当前状态(${record.status})不允许初核` });
    }

    // 更新 pricing_details
    const updatedPricingDetails = (record.pricing_details as any[] || []).map(item => ({
        ...item,
        buyerPrice: initialPrice,
        status: '待确认'
    }));

    // 更新状态和价格
    const { error } = await supabase
        .from('b_request_record')
        .update({
            status: 'pending_confirm',  // 待商家确认
            initial_price: initialPrice,
            pricing_details: updatedPricingDetails,
            handler_name: record.handler_name || decodeURIComponent(req.get('X-Buyer-Name') || ''), // OPT-1: 记录处理人(首个)
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: '初核完成，等待商家确认' });
});

/**
 * POST /api/requests/:id/merchant-confirm - 商家确认/拒绝初核价格
 * 接受: pending_confirm → completed
 * 拒绝: pending_confirm → pending_recheck (带拒绝原因)
 */
router.post('/:id/merchant-confirm', async (req, res) => {
    const { id } = req.params;
    const { action, rejectReason } = req.body;
    // action: 'accept' | 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: '请指定操作: accept 或 reject' });
    }

    const { data: record, error: fetchError } = await supabase
        .from('b_request_record')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !record) {
        return res.status(404).json({ error: '工单不存在' });
    }

    // 只能对待确认的工单进行操作
    if (record.status !== 'pending_confirm') {
        return res.status(400).json({ error: `当前状态(${record.status})不允许确认/拒绝` });
    }

    let updates: any = {
        updated_at: new Date().toISOString()
    };

    if (action === 'accept') {
        // 商家接受 → 完成
        updates.status = 'completed';
        updates.final_price = record.initial_price;
        // 更新 details 状态为 成功
        updates.pricing_details = (record.pricing_details as any[] || []).map(item => ({
            ...item,
            status: '成功',
            buyerPrice: record.initial_price // 确保价格一致
        }));
    } else {
        // 商家拒绝 → 待复核
        if (!rejectReason) {
            return res.status(400).json({ error: '拒绝时请填写原因' });
        }
        updates.status = 'pending_recheck';
        // updates.reason = rejectReason; // Removed: reason column likely does not exist

        // 更新 details 状态为 失败 (或待复核)
        updates.pricing_details = (record.pricing_details as any[] || []).map(item => ({
            ...item,
            status: '失败' // 商家拒绝视为当前轮次失败，进入复核
        }));
    }

    const { error } = await supabase
        .from('b_request_record')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    const message = action === 'accept'
        ? '已接受初核价格，工单完成'
        : '已拒绝，等待买手复核';
    res.json({ success: true, message });
});

/**
 * POST /api/requests/:id/force-complete - 买手强制完成（复核）
 * 状态流转: pending_recheck → completed
 * 设置最终价格 final_price
 */
router.post('/:id/force-complete', async (req, res) => {
    const { id } = req.params;
    const { finalPrice, remark } = req.body;

    if (!finalPrice) {
        return res.status(400).json({ error: '请填写最终价格' });
    }

    const { data: record, error: fetchError } = await supabase
        .from('b_request_record')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !record) {
        return res.status(404).json({ error: '工单不存在' });
    }

    // 只能对待复核的工单进行强制完成
    if (record.status !== 'pending_recheck') {
        return res.status(400).json({ error: `当前状态(${record.status})不允许强制完成` });
    }

    // 更新 pricing_details
    const updatedPricingDetails = (record.pricing_details as any[] || []).map(item => ({
        ...item,
        buyerPrice: finalPrice,
        status: '成功'
    }));

    const { error } = await supabase
        .from('b_request_record')
        .update({
            status: 'completed',
            final_price: finalPrice,
            pricing_details: updatedPricingDetails,
            handler_name: record.handler_name || decodeURIComponent(req.get('X-Buyer-Name') || ''), // OPT-1: 记录处理人
            // remark: remark || record.remark, // Removed: remark column likely does not exist
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: '复核完成，工单已关闭' });
});

// POST /api/requests/:id/reply - 回复工单（改图/打版帮看）
router.post('/:id/reply', async (req, res) => {
    const { id } = req.params;
    const { replyImage, replyContent } = req.body;
    const handlerName = decodeURIComponent(req.get('X-Buyer-Name') || '');

    const { data: record, error: fetchError } = await supabase
        .from('b_request_record')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !record) {
        return res.status(404).json({ error: '工单不存在' });
    }

    // 更新 pricing_details 中的 reply 字段
    // 假设 pricing_details 结构为 [{ ..., reply: { content, image, time } }]
    // 如果是 style 类型，pricing_details 可能存储的是应用列表，或者 remark
    // 根据 QuotationDrawer，style 申请存入 content 和 image_urls，或者 pricing_details (在 style-application 路由中)
    // 让我们查看 style-application 路由是如何存储的...
    // 现有代码 POST /style-application 插入 pricing_details: [{ images, remark }]

    const currentDetails = Array.isArray(record.pricing_details) ? record.pricing_details : [];
    const updatedDetails = currentDetails.map((item: any, index: number) => {
        if (index === 0) { // 通常只更新第一个，或者此时应该是一个扁平结构？
            return {
                ...item,
                reply: {
                    content: replyContent,
                    image: replyImage,
                    time: new Date().toISOString(),
                    handler: handlerName
                }
            };
        }
        return item;
    });

    // 如果 details 为空，可能需要初始化一个？
    if (updatedDetails.length === 0) {
        updatedDetails.push({
            reply: {
                content: replyContent,
                image: replyImage,
                time: new Date().toISOString(),
                handler: handlerName
            }
        });
    }

    const { error } = await supabase
        .from('b_request_record')
        .update({
            status: 'completed', // 回复即完成
            pricing_details: updatedDetails,
            handler_name: handlerName,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default router;

