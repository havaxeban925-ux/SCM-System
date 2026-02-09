import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/restock - 获取补货订单（支持分页和状态筛选）
router.get('/', async (req, res) => {
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

// PATCH /api/restock/:id/quantity - 更新数量
router.patch('/:id/quantity', async (req, res) => {
    const { id } = req.params;
    const { quantity, reason } = req.body;

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            actual_quantity: quantity,
            reduction_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/restock/:id/confirm - 确认接单
router.post('/:id/confirm', async (req, res) => {
    const { id } = req.params;

    const { data: order, error: fetchError } = await supabase
        .from('b_restock_order')
        .select('plan_quantity, actual_quantity')
        .eq('id', id)
        .single();

    if (fetchError || !order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    const actualQty = order.actual_quantity ?? order.plan_quantity;
    const newStatus = actualQty < order.plan_quantity ? 'reviewing' : 'producing';

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: newStatus,
            actual_quantity: actualQty,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/restock/:id/review - 复核砍量
router.post('/:id/review', async (req, res) => {
    const { id } = req.params;
    const { agree } = req.body;

    const newStatus = agree ? 'producing' : 'cancelled';

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/restock/:id/ship - 发货
router.post('/:id/ship', async (req, res) => {
    const { id } = req.params;
    const { wbNumber, logisticsCompany, shippedQty } = req.body;

    const { data: order, error: fetchError } = await supabase
        .from('b_restock_order')
        .select('actual_quantity, plan_quantity')
        .eq('id', id)
        .single();

    if (fetchError || !order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    const qty = shippedQty ?? order.actual_quantity ?? order.plan_quantity;

    const { error: logisticsError } = await supabase
        .from('b_restock_logistics')
        .insert({
            restock_order_id: id,
            wb_number: wbNumber,
            logistics_company: logisticsCompany,
            shipped_qty: qty,
            status: 0
        });

    if (logisticsError) return res.status(500).json({ error: logisticsError.message });

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: 'shipped',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/restock/:id/arrival - 确认入仓
router.post('/:id/arrival', async (req, res) => {
    const { id } = req.params;

    const { data: logistics, error: fetchError } = await supabase
        .from('b_restock_logistics')
        .select('id, shipped_qty')
        .eq('restock_order_id', id)
        .eq('status', 0);

    if (fetchError) return res.status(500).json({ error: fetchError.message });

    if (logistics && logistics.length > 0) {
        for (const log of logistics) {
            await supabase
                .from('b_restock_logistics')
                .update({
                    status: 1,
                    confirm_time: new Date().toISOString()
                })
                .eq('id', log.id);
        }
    }

    const totalArrived = logistics?.reduce((sum, l) => sum + l.shipped_qty, 0) || 0;

    const { data: order } = await supabase
        .from('b_restock_order')
        .select('actual_quantity, plan_quantity, arrived_quantity')
        .eq('id', id)
        .single();

    const newArrivedQty = (order?.arrived_quantity || 0) + totalArrived;
    const targetQty = order?.actual_quantity ?? order?.plan_quantity ?? 0;
    const isCompleted = newArrivedQty >= targetQty;

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: isCompleted ? 'completed' : 'shipped',
            arrived_quantity: newArrivedQty,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// GET /api/restock/:id/logistics - 获取物流明细
router.get('/:id/logistics', async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('b_restock_logistics')
        .select('*')
        .eq('restock_order_id', id)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// OPT-7: POST /api/restock/:id/reject - 商家拒绝补货订单
router.post('/:id/reject', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: 'rejected', // 商家拒绝接单
            reduction_reason: reason || '商家拒绝接单',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// OPT-7: POST /api/restock/:id/cancel-confirm - 买手确认取消订单
router.post('/:id/cancel-confirm', async (req, res) => {
    const { id } = req.params;
    const buyerName = req.headers['x-buyer-name'] as string || 'Unknown';

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: 'cancelled',
            remark: `由${buyerName}确认取消`,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/restock/batch - 批量创建大货订单
router.post('/batch', async (req, res) => {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ error: '请提供有效的订单数据' });
    }

    try {
        const toInsert = [];

        // Loop through orders and prepare insert data
        for (const o of orders) {
            const orderNo = await generateOrderNo('R');
            toInsert.push({
                shop_id: o.shopId,
                skc_code: o.skcCode,
                plan_quantity: o.planQuantity || 0,
                actual_quantity: o.planQuantity || 0, // Default to plan qty
                status: 'pending',
                remark: o.remark || '',
                order_no: orderNo,
                is_urgent: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            // Small delay to ensure orderNo randomness/time difference if sensitive (optional)
            // await new Promise(r => setTimeout(r, 10)); 
        }

        const { data, error } = await supabase
            .from('b_restock_order')
            .insert(toInsert)
            .select();

        if (error) {
            console.error('Batch insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({
            success: true,
            data: data,
            message: `成功创建 ${toInsert.length} 个大货订单`
        });
    } catch (err: any) {
        console.error('批量创建大货订单失败:', err);
        res.status(500).json({ error: err.message || '创建失败' });
    }
});

function generateOrderNo(prefix: string): Promise<string> {
    return new Promise((resolve) => {
        const date = new Date();
        const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        resolve(`${prefix}${dateStr}${random}`);
    });
}

export default router;
