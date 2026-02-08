import { api } from '../lib/api';
import { StyleDemand } from '../lib/supabase';
import { PaginatedResponse } from '../types';

// 获取开发中的款式
export async function getDevelopingStyles(): Promise<StyleDemand[]> {
    try {
        const res = await api.get<PaginatedResponse<StyleDemand>>('/api/development');
        return res.data || [];
    } catch (error) {
        console.error('Error fetching developing styles:', error);
        return [];
    }
}

// 更新开发状态
export async function updateDevStatus(
    id: string,
    status: StyleDemand['development_status']
): Promise<boolean> {
    try {
        await api.patch(`/api/development/${id}/status`, { status });
        return true;
    } catch (error) {
        console.error('Error updating dev status:', error);
        return false;
    }
}

// 申请改图帮看
export async function requestHelping(id: string, schemes?: any[], remark?: string): Promise<boolean> {
    try {
        await api.post(`/api/development/${id}/helping`, { schemes, remark });
        return true;
    } catch (error) {
        console.error('Error requesting helping:', error);
        return false;
    }
}

// 申请打版帮看
export async function requestPattern(id: string, schemes?: any[], remark?: string): Promise<boolean> {
    try {
        await api.post(`/api/development/${id}/pattern`, { schemes, remark });
        return true;
    } catch (error) {
        console.error('Error requesting pattern:', error);
        return false;
    }
}

// 上传SPU
export async function uploadSpu(id: string, spuList: string): Promise<boolean> {
    try {
        await api.post(`/api/development/${id}/spu`, { spuList });
        return true;
    } catch (error) {
        console.error('Error uploading SPU:', error);
        return false;
    }
}

// 放弃开发
export async function abandonDevelopment(id: string, reason?: string): Promise<boolean> {
    try {
        await api.post(`/api/development/${id}/abandon`, { reason });
        return true;
    } catch (error) {
        console.error('Error abandoning development:', error);
        return false;
    }
}

// 模拟买手确认帮看通过
export async function confirmHelpingOk(id: string): Promise<boolean> {
    try {
        await api.post(`/api/development/${id}/confirm-ok`);
        return true;
    } catch (error) {
        console.error('Error confirming helping ok:', error);
        return false;
    }
}
