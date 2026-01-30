import { api } from '../lib/api';
import { StyleDemand, PublicStyle } from '../lib/supabase';
import { PaginatedResponse } from '../types';

// 获取私推款式列表
export async function getPrivateStyles(shopId?: string): Promise<StyleDemand[]> {
    try {
        const url = shopId ? `/api/styles/private?shopId=${shopId}` : '/api/styles/private';
        const res = await api.get<PaginatedResponse<StyleDemand>>(url);
        return res.data || [];
    } catch (error) {
        console.error('Error fetching private styles:', error);
        return [];
    }
}

// 获取公池款式列表
export async function getPublicStyles(): Promise<PublicStyle[]> {
    try {
        const res = await api.get<PaginatedResponse<PublicStyle>>('/api/styles/public');
        return res.data || [];
    } catch (error) {
        console.error('Error fetching public styles:', error);
        return [];
    }
}

// 确认接款
export async function confirmStyle(id: string): Promise<boolean> {
    try {
        await api.post(`/api/styles/${id}/confirm`);
        return true;
    } catch (error) {
        console.error('Error confirming style:', error);
        return false;
    }
}

// 放弃接款
export async function abandonStyle(id: string): Promise<boolean> {
    try {
        await api.post(`/api/styles/${id}/abandon`);
        return true;
    } catch (error) {
        console.error('Error abandoning style:', error);
        return false;
    }
}

// 从公池创建新款式需求并接款
export async function createAndConfirmPublicStyle(publicStyle: PublicStyle): Promise<StyleDemand | null> {
    try {
        return await api.post<StyleDemand>(`/api/styles/public/${publicStyle.id}/confirm`, { publicStyle });
    } catch (error) {
        console.error('Error creating style from public pool:', error);
        return null;
    }
}

// 表达意向（公池）
export async function expressIntent(id: string): Promise<boolean> {
    try {
        await api.post(`/api/styles/public/${id}/intent`);
        return true;
    } catch (error) {
        console.error('Error expressing intent:', error);
        return false;
    }
}

// 获取名额统计
export async function getQuotaStats(shopId: string): Promise<{ current: number; limit: number } | null> {
    try {
        return await api.get<{ current: number; limit: number }>(`/api/styles/quota-stats?shopId=${shopId}`);
    } catch (error) {
        console.error('Error fetching quota stats:', error);
        return null;
    }
}
