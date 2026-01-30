import { api } from '../lib/api';
import { RestockOrder, RestockLogistics } from '../lib/supabase';
import { PaginatedResponse } from '../types';

// 获取补货订单列表
export async function getRestockOrders(): Promise<RestockOrder[]> {
    try {
        const res = await api.get<PaginatedResponse<RestockOrder>>('/api/restock');
        return res.data || [];
    } catch (error) {
        console.error('Error fetching restock orders:', error);
        return [];
    }
}

// 更新接单数量
export async function updateQuantity(
    id: string,
    quantity: number,
    reason?: string
): Promise<boolean> {
    try {
        await api.patch(`/api/restock/${id}/quantity`, { quantity, reason });
        return true;
    } catch (error) {
        console.error('Error updating quantity:', error);
        return false;
    }
}

// 商家确认接单/提交砍量申请
export async function confirmOrder(id: string): Promise<boolean> {
    try {
        await api.post(`/api/restock/${id}/confirm`);
        return true;
    } catch (error) {
        console.error('Error confirming order:', error);
        return false;
    }
}

// 买手复核砍量（同意/拒绝）
export async function reviewReduction(id: string, agree: boolean): Promise<boolean> {
    try {
        await api.post(`/api/restock/${id}/review`, { agree });
        return true;
    } catch (error) {
        console.error('Error reviewing reduction:', error);
        return false;
    }
}

// 商家发货
export async function shipOrder(
    id: string,
    wbNumber: string,
    logisticsCompany?: string,
    shippedQty?: number
): Promise<boolean> {
    try {
        await api.post(`/api/restock/${id}/ship`, { wbNumber, logisticsCompany, shippedQty });
        return true;
    } catch (error) {
        console.error('Error shipping order:', error);
        return false;
    }
}

// 买手/跟单员确认入仓
export async function confirmArrival(id: string): Promise<boolean> {
    try {
        await api.post(`/api/restock/${id}/arrival`);
        return true;
    } catch (error) {
        console.error('Error confirming arrival:', error);
        return false;
    }
}

// 获取订单物流明细
export async function getOrderLogistics(orderId: string): Promise<RestockLogistics[]> {
    try {
        return await api.get<RestockLogistics[]>(`/api/restock/${orderId}/logistics`);
    } catch (error) {
        console.error('Error fetching logistics:', error);
        return [];
    }
}
