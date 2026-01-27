import { supabase, RestockOrder, RestockLogistics } from '../lib/supabase';

// 获取补货订单列表
export async function getRestockOrders(): Promise<RestockOrder[]> {
    const { data, error } = await supabase
        .from('b_restock_order')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching restock orders:', error);
        return [];
    }
    return data || [];
}

// 更新接单数量
export async function updateQuantity(
    id: string,
    quantity: number,
    reason?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('b_restock_order')
        .update({
            actual_quantity: quantity,
            reduction_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating quantity:', error);
        return false;
    }
    return true;
}

// 商家确认接单/提交砍量申请
export async function confirmOrder(id: string): Promise<boolean> {
    // 先获取订单信息
    const { data: order, error: fetchError } = await supabase
        .from('b_restock_order')
        .select('plan_quantity, actual_quantity')
        .eq('id', id)
        .single();

    if (fetchError || !order) {
        console.error('Error fetching order:', fetchError);
        return false;
    }

    // 判断是否砍量
    const actualQty = order.actual_quantity ?? order.plan_quantity;
    const newStatus = actualQty < order.plan_quantity ? '待买手复核' : '生产中';

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: newStatus,
            actual_quantity: actualQty,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error confirming order:', error);
        return false;
    }
    return true;
}

// 买手复核砍量（同意/拒绝）
export async function reviewReduction(id: string, agree: boolean): Promise<boolean> {
    const newStatus = agree ? '生产中' : '已取消';

    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error reviewing reduction:', error);
        return false;
    }
    return true;
}

// 商家发货
export async function shipOrder(
    id: string,
    wbNumber: string,
    logisticsCompany?: string,
    shippedQty?: number
): Promise<boolean> {
    // 获取订单信息
    const { data: order, error: fetchError } = await supabase
        .from('b_restock_order')
        .select('actual_quantity, plan_quantity')
        .eq('id', id)
        .single();

    if (fetchError || !order) {
        console.error('Error fetching order:', fetchError);
        return false;
    }

    // 创建物流记录
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

    if (logisticsError) {
        console.error('Error creating logistics record:', logisticsError);
        return false;
    }

    // 更新订单状态
    const { error } = await supabase
        .from('b_restock_order')
        .update({
            status: '待买手确认入仓',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating order status:', error);
        return false;
    }
    return true;
}

// 买手/跟单员确认入仓
export async function confirmArrival(id: string): Promise<boolean> {
    // 获取物流记录并确认
    const { data: logistics, error: fetchError } = await supabase
        .from('b_restock_logistics')
        .select('id, shipped_qty')
        .eq('restock_order_id', id)
        .eq('status', 0);

    if (fetchError) {
        console.error('Error fetching logistics:', fetchError);
        return false;
    }

    // 更新所有物流记录为已入仓
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

    // 计算已入仓总数
    const totalArrived = logistics?.reduce((sum, l) => sum + l.shipped_qty, 0) || 0;

    // 获取订单actual_quantity判断是否完结
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
            status: isCompleted ? '已确认入仓' : '待买手确认入仓',
            arrived_quantity: newArrivedQty,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error confirming arrival:', error);
        return false;
    }
    return true;
}

// 获取订单物流明细
export async function getOrderLogistics(orderId: string): Promise<RestockLogistics[]> {
    const { data, error } = await supabase
        .from('b_restock_logistics')
        .select('*')
        .eq('restock_order_id', orderId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching logistics:', error);
        return [];
    }
    return data || [];
}
