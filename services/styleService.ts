import { api } from '../lib/api';
import { StyleDemand, PublicStyle } from '../lib/supabase';

// 获取私推款式列表
export async function getPrivateStyles(): Promise<StyleDemand[]> {
    try {
        return await api.get<StyleDemand[]>('/api/styles/private');
    } catch (error) {
        console.error('Error fetching private styles:', error);
        return [];
    }
}

// 获取公池款式列表
export async function getPublicStyles(): Promise<PublicStyle[]> {
    try {
        return await api.get<PublicStyle[]>('/api/styles/public');
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
