/**
 * SCM 测试机器人 - API 客户端
 * 封装所有 API 调用
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
    success?: boolean;
    data?: T;
    error?: string;
    total?: number;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: any
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Request failed: ${response.status}`);
        }

        return data;
    }

    // GET 请求
    async get<T>(path: string): Promise<T> {
        return this.request<T>('GET', path);
    }

    // POST 请求
    async post<T>(path: string, body?: any): Promise<T> {
        return this.request<T>('POST', path, body);
    }

    // PATCH 请求
    async patch<T>(path: string, body?: any): Promise<T> {
        return this.request<T>('PATCH', path, body);
    }

    // DELETE 请求
    async delete<T>(path: string): Promise<T> {
        return this.request<T>('DELETE', path);
    }

    // ========== 款式相关 API ==========

    // 私推款式
    async pushPrivate(styles: any[]) {
        return this.post('/api/admin/push/private', { styles });
    }

    // 公推款式
    async pushPublic(data: { imageUrl: string; name: string; remark?: string; tags?: string[]; maxIntents?: number }) {
        return this.post('/api/admin/push/public', data);
    }

    // 获取私推列表
    async getPrivateStyles(shopId?: string) {
        const query = shopId ? `?shopId=${shopId}` : '';
        return this.get(`/api/styles/private${query}`);
    }

    // 获取公推列表
    async getPublicStyles() {
        return this.get('/api/styles/public');
    }

    // 确认接款
    async confirmStyle(id: string) {
        return this.post(`/api/styles/${id}/confirm`);
    }

    // 放弃接款
    async abandonStyle(id: string) {
        return this.post(`/api/styles/${id}/abandon`);
    }

    // ========== 开发进度 API ==========

    // 获取开发中款式
    async getDevelopingStyles(status?: string) {
        const query = status ? `?status=${status}` : '';
        return this.get(`/api/development${query}`);
    }

    // 更新开发状态
    async updateDevStatus(id: string, status: string) {
        return this.patch(`/api/development/${id}/status`, { status });
    }

    // 申请帮看
    async requestHelping(id: string, imageUrl?: string) {
        return this.post(`/api/development/${id}/helping`, { imageUrl });
    }

    // 上传SPU
    async uploadSpu(id: string, spuList: string[]) {
        return this.post(`/api/development/${id}/spu`, { spuList });
    }

    // 放弃开发
    async abandonDevelopment(id: string, reason?: string) {
        return this.post(`/api/development/${id}/abandon`, { reason });
    }

    // ========== 申请记录 API ==========

    // 获取申请列表
    async getRequests(type?: string) {
        const query = type ? `?type=${type}` : '';
        return this.get(`/api/requests${query}`);
    }

    // 提交核价申请
    async submitQuote(data: { subType: string; shopName: string; quotes: any[] }) {
        return this.post('/api/requests/quote', data);
    }

    // 提交同款同价
    async submitSamePrice(data: { shopName: string; items: any[] }) {
        return this.post('/api/requests/same-price', data);
    }

    // 提交涨价申请
    async submitPriceIncrease(data: { shopName: string; items: any[] }) {
        return this.post('/api/requests/price-increase', data);
    }

    // 提交异常申请
    async submitAnomaly(data: { shopName: string; subType: string; targetCodes: string[]; content?: string }) {
        return this.post('/api/requests/anomaly', data);
    }

    // 审批申请
    async auditRequest(id: string, action: 'approve' | 'reject', feedback?: string, buyerPrices?: any) {
        return this.post(`/api/requests/${id}/audit`, { action, feedback, buyerPrices });
    }

    // 撤销申请
    async deleteRequest(id: string) {
        return this.delete(`/api/requests/${id}`);
    }

    // ========== 补货订单 API ==========

    // 获取补货订单
    async getRestockOrders(status?: string) {
        const query = status ? `?status=${status}` : '';
        return this.get(`/api/restock${query}`);
    }

    // 更新数量（砍量）
    async updateRestockQuantity(id: string, quantity: number, reason?: string) {
        return this.patch(`/api/restock/${id}/quantity`, { quantity, reason });
    }

    // 确认接单
    async confirmRestock(id: string) {
        return this.post(`/api/restock/${id}/confirm`);
    }

    // 复核
    async reviewRestock(id: string, agree: boolean) {
        return this.post(`/api/restock/${id}/review`, { agree });
    }

    // 发货
    async shipRestock(id: string, data: { wbNumber: string; logisticsCompany: string; shippedQty?: number }) {
        return this.post(`/api/restock/${id}/ship`, data);
    }

    // 确认入仓
    async confirmArrival(id: string) {
        return this.post(`/api/restock/${id}/arrival`);
    }

    // ========== 管理后台 API ==========

    // 获取看板数据
    async getDashboard() {
        return this.get('/api/admin/dashboard');
    }

    // 获取商铺列表
    async getShops(page?: number, pageSize?: number) {
        const query = `?page=${page || 1}&pageSize=${pageSize || 50}`;
        return this.get(`/api/admin/shops${query}`);
    }

    // 健康检查
    async healthCheck() {
        return this.get('/api/health');
    }
}

export const api = new ApiClient();
export { ApiClient };
