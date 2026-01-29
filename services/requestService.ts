import { api } from '../lib/api';
import { RequestRecord } from '../lib/supabase';

// 获取申请记录列表
export async function getRequestRecords(): Promise<RequestRecord[]> {
    try {
        return await api.get<RequestRecord[]>('/api/requests');
    } catch (error) {
        console.error('Error fetching request records:', error);
        return [];
    }
}

// 创建核价申请（报价单）
export async function createQuoteRequest(
    subType: string,
    shopName: string,
    quotes: Array<{
        type: 'WOOL' | 'NORMAL';
        code: string;
        price: number;
        detailJson?: object;
    }>
): Promise<RequestRecord | null> {
    try {
        return await api.post<RequestRecord>('/api/requests/quote', { subType, shopName, quotes });
    } catch (error) {
        console.error('Error creating quote request:', error);
        return null;
    }
}

// 创建同款同价申请
export async function createSamePriceRequest(
    shopName: string,
    items: Array<{
        targetCode: string;
        refCode: string;
        refPrice: string;
        suggestedPrice: string;
    }>
): Promise<RequestRecord | null> {
    try {
        return await api.post<RequestRecord>('/api/requests/same-price', { shopName, items });
    } catch (error) {
        console.error('Error creating same price request:', error);
        return null;
    }
}

// 创建申请涨价
export async function createPriceIncreaseRequest(
    shopName: string,
    items: Array<{
        targetCode: string;
        increasePrice: string;
    }>
): Promise<RequestRecord | null> {
    try {
        return await api.post<RequestRecord>('/api/requests/price-increase', { shopName, items });
    } catch (error) {
        console.error('Error creating price increase request:', error);
        return null;
    }
}

// 创建异常申请
export async function createAnomalyRequest(
    subType: string,
    targetCodes: string[],
    content?: string
): Promise<RequestRecord | null> {
    try {
        return await api.post<RequestRecord>('/api/requests/anomaly', { subType, targetCodes, content });
    } catch (error) {
        console.error('Error creating anomaly request:', error);
        return null;
    }
}

// 提交二次核价申请
export async function submitSecondaryReview(
    recordId: string,
    skc: string,
    secondPrice: number,
    secondReason: string
): Promise<boolean> {
    try {
        await api.post(`/api/requests/${recordId}/secondary-review`, { skc, secondPrice, secondReason });
        return true;
    } catch (error) {
        console.error('Error submitting secondary review:', error);
        return false;
    }
}
